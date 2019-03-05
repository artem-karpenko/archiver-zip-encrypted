import java.io.IOException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;

public class Test {
    private static final int keys[] = new int[3];
    private static final int pwdKeys[] = new int[3];
    private static final ArrayList<int[][]> crcAndSize = new ArrayList<int[][]>();
    private static byte[] decryptHeader;

    private static void initKeys() {
        System.arraycopy(pwdKeys, 0, keys, 0, keys.length);
    }

    private static void updateKeys(byte charAt) {
        ZipUtil.updateKeys(charAt, keys);
    }

    private static byte encryptByte() {
        int temp = keys[2] | 2;
        return (byte) ((temp * (temp ^ 1)) >>> 8);
    }

    private static int encrypt(int b) {
        System.out.println("Incoming byte:" + b);
        int newB = (b ^ encryptByte()) & 0xff;
        System.out.println("New byte: " + newB);
        updateKeys((byte) b);
        System.out.print("Keys:");

        for (int i = 0; i < keys.length; i++) {
            System.out.print(keys[i] + ",");
        }
        System.out.println();

        return newB;
    }

    private static void writeDecryptHeader() throws IOException {
        initKeys();

        crcAndSize.add(new int[][]{{0, 0, 0x33, 0xD8}});

        int[] crc = crcAndSize.get(crcAndSize.size() - 1)[0];
        SecureRandom random = new SecureRandom();
        decryptHeader = new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 0x10, 0x33, (byte) 0xd8};
        // random.nextBytes(decryptHeader);

        decryptHeader[ZipUtil.DECRYPT_HEADER_SIZE - 2] = (byte) crc[2];
        decryptHeader[ZipUtil.DECRYPT_HEADER_SIZE - 1] = (byte) crc[3];
        for (int i = 0; i < ZipUtil.DECRYPT_HEADER_SIZE; i++) {
            int en = encrypt(decryptHeader[i]);
            // System.out.print(Integer.toHexString(en));
        }
    }

    public static void main(String[] args) throws IOException {
        pwdKeys[0] = 305419896;
        pwdKeys[1] = 591751049;
        pwdKeys[2] = 878082192;

        byte[] password = "123".getBytes();
        for (int i = 0; i < password.length; i++) {
            ZipUtil.updateKeys((byte) (password[i] & 0xff), pwdKeys);
        }

        System.out.println(Arrays.toString(pwdKeys));

        writeDecryptHeader();
    }
}
