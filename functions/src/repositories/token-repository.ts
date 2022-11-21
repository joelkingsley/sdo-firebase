import * as functions from "firebase-functions";
import { JWTService } from "../services/jwt-service";
import * as fs from "fs";
import axios from "axios";

export class TokenRepository {
  async getAppleIdRefreshToken(
    req: functions.https.Request,
    res: functions.Response<any>
  ): Promise<any> {
    const code = req.body.code as string | undefined;
    if (code == undefined) {
      return res.status(401).send({
        error: {
          code: "CODE_NOT_SET",
          message: "Authorization code is not set",
        },
      });
    }

    const jwtService = new JWTService();

    const teamId = "A5U7V8A368";
    const expiryInSeconds = 3600;
    const keyId = process.env.APPLE_AUTH_KEY_ID as string;
    const appId = "online.sounddoctrine.sdo-apple";
    const audience = "https://appleid.apple.com";
    const algorithm = "ES256";

    // Note: Download key file from developer.apple.com/account/resources/authkeys/list
    const appleAuthKeyFileName = process.env.APPLE_AUTH_KEY_FILE_NAME as string;
    const privateKey = fs.readFileSync(`src/assets/apple-auth-keys/${appleAuthKeyFileName}`);

    // Sign with your team ID and key ID information.
    return jwtService.makeJWT(
      teamId,
      expiryInSeconds,
      audience,
      appId,
      algorithm,
      keyId,
      privateKey
    ).then(async (clientSecret: string) => {
      const data = {
        "code": code,
        "client_id": appId,
        "client_secret": clientSecret,
        "grant_type": "authorization_code",
      };

      // Validate the authorization grant code to get a refresh token
      return axios.post("https://appleid.apple.com/auth/token", new URLSearchParams(data), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }).then(async (authTokenResponse) => {
        const refreshToken = authTokenResponse.data.refresh_token;
        return res.status(200).send({ refreshToken: refreshToken });
      }).catch((err) => {
        return res.status(500).send({
          error: {
            errorObject: err,
          },
        });
      });
    });
  }
}
