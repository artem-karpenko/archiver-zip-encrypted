import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.xml.bind.DatatypeConverter;
import java.security.Security;

public class AesTest {
    public static void main(String[] args) {
//        System.out.println(Security.getAlgorithms("Cipher"));

//        System.out.println(DatatypeConverter.printHexBinary(new byte[]{1, 2, 3}));
        System.out.println(encrypt(
                DatatypeConverter.parseHexBinary("7e034dc74f9543131497fc7603e7bb506d5880c580bb351f97678cde50613448"),
                DatatypeConverter.parseHexBinary("C8208C7C221D1BCCA164C6D79B485033"), "Hello zip!"));
    }

    public static String encrypt(byte[] key, byte[] initVector, String value) {
        try {
            IvParameterSpec iv = new IvParameterSpec(initVector);
            SecretKeySpec skeySpec = new SecretKeySpec(key, "AES");

            Cipher cipher = Cipher.getInstance("AES/CTR/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, skeySpec, iv);

            byte[] encrypted = cipher.doFinal(value.getBytes());

            return DatatypeConverter.printHexBinary(encrypted);
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return null;
    }
}
