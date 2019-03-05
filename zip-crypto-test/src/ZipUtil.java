public class ZipUtil {
    static final int[] CRC_TABLE = new int[256];
    // compute the table
    // (could also have it pre-computed - see http://snippets.dzone.com/tag/crc32)
    static {
        for (int i = 0; i < 256; i++) {
            int r = i;
            for (int j = 0; j < 8; j++) {
                if ((r & 1) == 1) {
                    r = (r >>> 1) ^ 0xedb88320;
                } else {
                    r >>>= 1;
                }
            }
            CRC_TABLE[i] = r;
        }

        System.out.println(CRC_TABLE[0]);
        System.out.println(CRC_TABLE[10]);
        System.out.println(CRC_TABLE[20]);
        System.out.println(CRC_TABLE[30]);
        System.out.println(CRC_TABLE[255]);
    }

    static final int DECRYPT_HEADER_SIZE = 12;
    static final int[] CFH_SIGNATURE = {0x50, 0x4b, 0x01, 0x02};
    static final int[] LFH_SIGNATURE = {0x50, 0x4b, 0x03, 0x04};
    static final int[] ECD_SIGNATURE = {0x50, 0x4b, 0x05, 0x06};
    static final int[] DD_SIGNATURE = {0x50, 0x4b, 0x07, 0x08};

    static void updateKeys(byte charAt, int[] keys) {
        keys[0] = crc32(keys[0], charAt);
        keys[1] += keys[0] & 0xff;
        // System.out.println("key1':" + keys[1]);
        keys[1] = keys[1] * 134775813 + 1;
        // System.out.println("key1:" + keys[1]);
        keys[2] = crc32(keys[2], (byte) (keys[1] >> 24));
    }

    static int crc32(int oldCrc, byte charAt) {
        return ((oldCrc >>> 8) ^ CRC_TABLE[(oldCrc ^ charAt) & 0xff]);
    }

    static enum State {
        SIGNATURE, FLAGS, COMPRESSED_SIZE, FN_LENGTH, EF_LENGTH, HEADER, DATA, TAIL, CRC
    }

    static enum Section {
        FILE_HEADER, FILE_DATA, DATA_DESCRIPTOR
    }
}