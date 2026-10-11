import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: "ap-southeast-1", // same region you used
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const {
    ownerEmail,
    ownerName,
    accepterName,
    accepterEmail,
    taskTitle,
    taskDescription,
    deadline,
  } = req.body;

  try {
    const params = {
      Source: process.env.SES_FROM_EMAIL, // your verified email
      Destination: {
        ToAddresses: [ownerEmail],
      },
      Message: {
        Subject: {
          Data: `Your task was picked up`,
        },
        Body: {
          Text: {
            Data: `
Hi ${ownerName},

Your task "${taskTitle}" has been accepted.

Accepted by: ${accepterName}
Email: ${accepterEmail}

Task:
${taskDescription || "No description"}

Deadline:
${deadline || "No deadline"}

- GuildUp
            `,
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await ses.send(command);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ message: "Failed to send email" });
  }
}