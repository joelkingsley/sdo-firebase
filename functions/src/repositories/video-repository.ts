import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HasuraGraphQLService } from "../services/hasura-graphql-service";

export class VideoRepository {
  async createGoogleCloudStorageSignedUrl(
    req: functions.https.Request,
    res: functions.Response<any>,
    videoId: string | undefined
  ): Promise<any> {
    if (videoId == undefined) {
      return res.status(400).send({ error: "videoId should not be empty" });
    } else {
      try {
        // Verify id token
        const idToken = req.get("Authorization")?.replace("Bearer ", "") ?? "";
        await admin.auth().verifyIdToken(idToken);
      } catch (err) {
        return res.status(401).send({ error: { code: "TOKEN_INVALID", errorObject: err } });
      }

      // Get cloud storage video details
      const hasuraGraphQLService = new HasuraGraphQLService();
      const cloudStorageVideoDetails = await hasuraGraphQLService.fetchGetCloudStorageVideoDetails(videoId)
        .then(({ data }) => {
          return data?.videos[0];
        })
        .catch((err) => {
          return res.status(500).send({ error: { code: "SERVER_ERROR", errorObject: err } });
        });

      // Validate bucketName and fileName
      const bucketName: string | undefined = cloudStorageVideoDetails?.gcp_storage_bucket_name;
      const fileName: string | undefined = cloudStorageVideoDetails?.gcp_storage_file_name;
      if (bucketName == undefined || fileName == undefined) {
        if (bucketName == undefined && fileName == undefined) {
          return res.status(500).send({
            error: {
              code: "SERVER_ERROR",
              message: "bucketName and fileName not found",
            },
          });
        } else if (bucketName == undefined) {
          return res.status(500).send({
            error: {
              code: "SERVER_ERROR",
              message: "bucketName not found",
            },
          });
        } else {
          return res.status(500).send({
            error: {
              code: "SERVER_ERROR",
              message: "fileName not found",
            },
          });
        }
      }

      try {
        // Creates a client
        const storage = admin.storage();

        // These options will allow temporary read access to the file
        const options = {
          version: "v4" as "v2" | "v4",
          action: "read" as "read" | "write" | "delete" | "resumable",
          expires: Date.now() + 60 * 60 * 1000, // 60 minutes
        };

        // Get a v4 signed URL for reading the file
        const [url] = await storage
          .bucket(bucketName)
          .file(fileName)
          .getSignedUrl(options);
        console.log(`Generated GET signed URL: ${url}`);
        console.log("You can use this URL with any user agent, for example:");
        console.log(`curl '${url}'`);
        return res.status(200).send({ signedUrl: url });
      } catch (err) {
        return res.status(500).send({ error: { code: "SIGNING_URL_ERROR", errorObject: err } });
      }
    }
  }
}
