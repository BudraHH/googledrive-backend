import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3Client } from "./src/config/s3Config.js";

const testS3Connection = async () => {
    try {
        console.log("Testing AWS S3 Connection...");
        console.log("Bucket:", process.env.AWS_BUCKET_NAME);
        console.log("Region:", process.env.AWS_REGION);

        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME,
        });
        const response = await s3Client.send(command);
        console.log("✅ AWS S3 Connection Successful!");
        if (response.Contents) {
            console.log(`Found ${response.Contents.length} objects.`);
        } else {
            console.log("Bucket is empty.");
        }
    } catch (err) {
        console.error("❌ S3 Connection Error:", err.message);
        console.log("Check your .env file credentials!");
    }
};

testS3Connection();
