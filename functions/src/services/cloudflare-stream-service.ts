export class CloudflareStreamService {
  jwkKey = "";
  keyID = "";
  expiresTimeInSeconds = 3600;

  /**
   * Generates stream token to be used with signed URLs
   * @param {string} videoID Cloudflare video ID
   * @return {string} The generated stream token
   */
  async generateStreamToken(
    videoID: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const expiresIn = Math.floor(Date.now() / 1000) + this.expiresTimeInSeconds;
    const headers = {
      "alg": "RS256",
      "kid": this.keyID,
    };
    const data = {
      "sub": videoID,
      "kid": this.keyID,
      "exp": expiresIn,
      "accessRules": [
        {
          "type": "ip.geoip.country",
          "action": "allow",
          "country": [
            "GB",
          ],
        },
        {
          "type": "any",
          "action": "block",
        },
      ],
    };

    const token = `${this.objectToBase64url(headers)}.${this.objectToBase64url(data)}`;
    const jwk = JSON.parse(atob(this.jwkKey));
    const key = await crypto.subtle.importKey(
      "jwk", jwk,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false, ["sign"]
    );
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" }, key,
      encoder.encode(token)
    );
    const signedToken = `${token}.${this.arrayBufferToBase64Url(signature)}`;
    return signedToken;
  }

  // Utilities functions
  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  private objectToBase64url(payload: any): string {
    return this.arrayBufferToBase64Url(
      new TextEncoder().encode(JSON.stringify(payload)),
    );
  }
}
