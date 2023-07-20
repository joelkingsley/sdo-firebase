import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HasuraGraphQLService } from "../services/hasura-graphql-service";
import { Algorithms } from "../utils/algorithms";

export class VideoRepository {
  private hasuraGraphQLService = new HasuraGraphQLService();
  private storage = admin.storage();

  /**
   * @deprecated Legacy getSignedUrlOfVideo method
   * @param {functions.https.Request} req Firebase functions request object
   * @param {functions.Response<any>} res Firebase functions response object
   * @param {string | undefined} videoId The id of the video to get the signed url for
   */
  async getSignedUrlOfVideoLegacy(
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
          return this.hasuraGraphQLService.fetchGetCloudStorageVideoDetailsLegacy(videoId)
            .then(({ data }) => {
              // Validate bucketName and fileName
              const cloudStorageVideoDetails = data?.videos[0];
              const videoBucketName: string | undefined = cloudStorageVideoDetails?.gcp_storage_bucket_name;
              const videoFileName: string | undefined = cloudStorageVideoDetails?.gcp_storage_file_name;
              if (
                videoBucketName == undefined ||
                videoFileName == undefined
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
              return Promise.all([getSignedVideoUrl])
                .then((results) => {
                  const [videoUrl] = results[0];
                  return res.status(200).send({
                    videoUrl: videoUrl,
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

  /**
   * Gets the signed url for a specified video
   * @param {functions.https.Request} req Firebase functions request object
   * @param {functions.Response<any>} res Firebase functions response object
   * @param {string | undefined} videoId The id of the video to get the signed url for
   */
  async getSignedUrlOfVideo(
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
          console.log("Completed idToken verification successfully");
          // Get cloud storage video details from Hasura
          return this.hasuraGraphQLService.fetchGetCloudStorageVideoDetails(videoId)
            .then(({ data }) => {
              console.log("Completed fetching cloud storage video details successfully");
              // Validate bucketName and fileName
              const cloudStorageVideoDetails = data?.videos[0];
              const gcpVideoBucketName: string | undefined = cloudStorageVideoDetails?.gcpStorageBucketName;
              const gcpVideoFileName: string | undefined = cloudStorageVideoDetails?.gcpStorageFileName;
              const bunnyHlsVideoUrl: string | undefined = cloudStorageVideoDetails?.bunnyStorageHlsUrl;
              if (
                (gcpVideoBucketName == undefined || gcpVideoFileName == undefined) ||
                (gcpVideoBucketName.length <= 0 || gcpVideoFileName.length <= 0)
              ) {
                if (bunnyHlsVideoUrl == undefined || bunnyHlsVideoUrl.length <= 0) {
                  return res.status(500).send({
                    error: {
                      code: "SERVER_ERROR",
                      message: "Neither gcpVideoBucketName & gcpStorageFileName or bunnyHlsVideoUrl found",
                    },
                  });
                } else {
                  return res.status(200).send({
                    videoUrl: bunnyHlsVideoUrl,
                  });
                }
              } else {
                // These options will allow temporary read access to the file
                const options = {
                  version: "v4" as "v2" | "v4",
                  action: "read" as "read" | "write" | "delete" | "resumable",
                  expires: Date.now() + 60 * 60 * 1000, // 60 minutes
                };

                // Get a v4 signed URL for reading the file
                const getSignedVideoUrl = this.storage
                  .bucket(gcpVideoBucketName).file(gcpVideoFileName).getSignedUrl(options);
                return Promise.all([getSignedVideoUrl])
                  .then((results) => {
                    const [videoUrl] = results[0];
                    return res.status(200).send({
                      videoUrl: videoUrl,
                    });
                  })
                  .catch((err) => {
                    return res.status(500).send({ error: { code: "SIGNING_URL_ERROR", errorObject: err } });
                  });
              }
            })
            .catch((err) => {
              console.log("Error while fetching cloud storage video details");
              return res.status(500).send({ error: { code: "SERVER_ERROR", errorObject: err } });
            });
        })
        .catch((err) => {
          console.log("Token invalid");
          return res.status(401).send({ error: { code: "TOKEN_INVALID", errorObject: err } });
        });
    }
  }

  signCookie(
    req: functions.https.Request,
    res: functions.Response<any>,
    urlPrefix: string | undefined,
    keyName: string | undefined,
    key: string | undefined,
    expiration: number | undefined
  ): Promise<string> {
    return new Promise<string>(() => {
      if (urlPrefix == undefined) {
        return res.status(400).send({
          error: {
            code: "URL_PREFIX_NOT_SET",
            message: "urlPrefix should not be empty",
          },
        });
      } else if (keyName == undefined) {
        return res.status(400).send({
          error: {
            code: "KEY_NAME_NOT_SET",
            message: "keyName should not be empty",
          },
        });
      } else if (key == undefined) {
        return res.status(400).send({
          error: {
            code: "KEY_NOT_SET",
            message: "key should not be empty",
          },
        });
      } else if (expiration == undefined) {
        return res.status(400).send({
          error: {
            code: "EXPIRATION_NOT_SET",
            message: "expiration should not be empty",
          },
        });
      }
      const expirationDate = new Date(expiration * 1000);
      return res.status(200).send(Algorithms.signCookie(urlPrefix, keyName, key, expirationDate));
    });
  }
}
