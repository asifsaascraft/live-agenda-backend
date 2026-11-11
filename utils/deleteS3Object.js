// utils/deleteS3Object.js

import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import s3 from "../config/s3.js";

const deleteS3Object = async (fileUrl) => {
  try {
    // Nothing to delete

    if (!fileUrl) {
      return;
    }

    // Example:
    // https://bucket-name.s3.eu-west-2.amazonaws.com/users/abc.jpg

    const url = new URL(fileUrl);

    // users/abc.jpg

    const key = decodeURIComponent(url.pathname.substring(1));

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,

        Key: key,
      }),
    );
  } catch (error) {
    console.error("S3 Delete Error:", error);
  }
};

export default deleteS3Object;