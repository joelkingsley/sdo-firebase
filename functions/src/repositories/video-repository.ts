import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HasuraGraphQLService } from "../services/hasura-graphql-service";

export class VideoRepository {
  private hasuraGraphQLService = new HasuraGraphQLService();
  private storage = admin.storage();

  async createGoogleCloudStorageSignedUrl(
    req: functions.https.Request,
    res: functions.Response<any>,
    videoId: string | undefined
  ): Promise<any> {
    if (videoId == undefined) {
      return res.status(400).send({ error: { code: "VIDEO_ID_NOT_SET", message: "videoId should not be empty" } });
    } else {
      // Verify ID token
      const idToken = req.get("Authorization")?.replace("Bearer ", "") ?? "";
      return admin.auth().verifyIdToken(idToken)
        .then(() => {
          // Get cloud storage video details from Hasura
          return this.hasuraGraphQLService.fetchGetCloudStorageVideoDetails(videoId)
            .then(({ data }) => {
              // Validate bucketName and fileName
              const cloudStorageVideoDetails = data?.videos[0];
              const videoBucketName: string | undefined = cloudStorageVideoDetails?.gcp_storage_bucket_name;
              const videoFileName: string | undefined = cloudStorageVideoDetails?.gcp_storage_file_name;
              const thumbnailBucketName: string | undefined = cloudStorageVideoDetails?.gcp_thumbnail_bucket_name;
              const thumbnailFileName: string | undefined = cloudStorageVideoDetails?.gcp_thumbnail_file_name;
              if (
                videoBucketName == undefined ||
                videoFileName == undefined ||
                thumbnailBucketName == undefined ||
                thumbnailFileName == undefined
              ) {
                return res.status(500).send({
                  error: {
                    code: "SERVER_ERROR",
                    message: "videoBucketName or fileName not found",
                  },
                });
              }
              // These options will allow temporary read access to the file
              const options = {
                version: "v4" as "v2" | "v4",
                action: "read" as "read" | "write" | "delete" | "resumable",
                expires: Date.now() + 60 * 60 * 1000, // 60 minutes
              };

              // Get a v4 signed URL for reading the file
              const getSignedVideoUrl = this.storage
                .bucket(videoBucketName).file(videoFileName).getSignedUrl(options);
              const getSignedThumbnailUrl = this.storage
                .bucket(thumbnailBucketName).file(thumbnailFileName).getSignedUrl(options);
              return Promise.all([getSignedVideoUrl, getSignedThumbnailUrl])
                .then((results) => {
                  const [videoUrl] = results[0];
                  const [thumbnailUrl] = results[1];
                  return res.status(200).send({
                    videoUrl: videoUrl,
                    thumbnailUrl: thumbnailUrl,
                    isVideoAccessibleToUser: true,
                  });
                })
                .catch((err) => {
                  return res.status(500).send({ error: { code: "SIGNING_URL_ERROR", errorObject: err } });
                });
            });
        })
        .catch((err) => {
          return res.status(401).send({ error: { code: "TOKEN_INVALID", errorObject: err } });
        });
    }
  }
}
