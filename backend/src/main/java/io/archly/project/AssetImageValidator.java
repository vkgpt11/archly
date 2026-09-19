package io.archly.project;

import java.io.ByteArrayInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class AssetImageValidator {
    record Image(String type,int width,int height,String hash) {}
    Image validate(byte[] bytes,String declaredType) {
        if(bytes.length==0 || bytes.length>2_000_000)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"Images must be 2 MB or smaller.");
        try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers=ImageIO.getImageReaders(input);
            if(!readers.hasNext())throw invalid();
            var reader=readers.next();
            try {
                String format=reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                String type=switch(format){case "png" -> "image/png";case "jpeg","jpg" -> "image/jpeg";case "webp" -> "image/webp";default -> throw invalid();};
                if(declaredType!=null && !type.equals(declaredType.split(";")[0]))throw invalid();
                reader.setInput(input);int width=reader.getWidth(0),height=reader.getHeight(0);
                if(width<1 || height<1 || width>10_000 || height>10_000 || (long)width*height>20_000_000)throw invalid();
                if(reader.read(0)==null)throw invalid();
                return new Image(type,width,height,HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));
            }finally{reader.dispose();}
        }catch(ResponseStatusException exception){throw exception;}catch(Exception exception){throw invalid();}
    }
    private ResponseStatusException invalid(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use a valid PNG, JPEG or WebP image of at most 20 megapixels.");}
}
