import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export class BucketRepository {
  private storage = admin.storage();

  async getCORSConfigurationOfBucket(
    req: functions.https.Request,
    res: functions.Response<any>,
    bucketName: string | undefined
  ): Promise<any> {
    if (bucketName == undefined) {
      return res.status(400).send({
        error: {
          code: "BUCKET_NAME_NOT_SET",
          message: "bucketName should not be empty",
        },
      });
    }
    const [metadata] = await this.storage.bucket(bucketName).getMetadata();
    return res.status(200).send(metadata);
  }

  async configureCORSConfigurationOnBucket(
    req: functions.https.Request,
    res: functions.Response<any>,
    bucketName: string | undefined,
    origin: string | undefined
  ): Promise<any> {
    if (bucketName == undefined) {
      return res.status(400).send({
        error: {
          code: "BUCKET_NAME_NOT_SET",
          message: "bucketName should not be empty",
        },
      });
    } else if (origin == undefined) {
      return res.status(400).send({
        error: {
          code: "ORIGIN_NAME_NOT_SET",
          message: "origin should not be empty",
        },
      });
    }
    const maxAgeSeconds = 3600;
    const method = "GET";
    const responseHeader = "Content-Type";
    const setBucketMetadataResponse = await this.storage.bucket(bucketName).setCorsConfiguration([
      {
        maxAgeSeconds,
        method: [method],
        origin: [origin],
        responseHeader: [responseHeader],
      },
    ]);
    return res.status(200).send({
      response: setBucketMetadataResponse,
      message: `Bucket ${bucketName} was updated with a CORS config
      to allow ${method} requests from ${origin} sharing 
      ${responseHeader} responses across origins`,
    });
  }
}
