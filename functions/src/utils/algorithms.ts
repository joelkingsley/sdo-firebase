import { createHmac } from "crypto";

export class Algorithms {
  static signCookie(urlPrefix: any, keyName: string, key: any, expiration: Date): string {
    // Base64url encode the url prefix
    const urlPrefixEncoded = Buffer.from(urlPrefix)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Input to be signed
    const input = `URLPrefix=${urlPrefixEncoded}:Expires=${expiration.getTime()}:KeyName=${keyName}`;

    // Create bytes from given key string.
    const keyBytes = Buffer.from(key, "base64");

    /**
     * Use key bytes and crypto.createHmac to produce a base64 encoded signature
     * which is then escaped to be base64url encoded.
     * */
    const signature = createHmac("sha1", keyBytes)
      .update(input)
      .digest("base64").replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Adding the signature on the end if the cookie value
    const signedValue = `${input}:Signature=${signature}`;

    return signedValue;
  }
}
