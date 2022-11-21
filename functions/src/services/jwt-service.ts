import * as jwt from "jsonwebtoken";
import { Algorithm } from "jsonwebtoken";

export class JWTService {
  async makeJWT(
    issuer: string,
    expiryInSeconds: number,
    audience: string,
    subject: string,
    algorithm: Algorithm,
    keyId: string,
    privateKey: Buffer
  ) {
    const token = jwt.sign({
      iss: issuer,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiryInSeconds,
      aud: audience,
      sub: subject,
    }, privateKey, {
      algorithm: algorithm,
      header: {
        alg: algorithm,
        kid: keyId,
      },
    });

    return token;
  }
}
