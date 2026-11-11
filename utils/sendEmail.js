
import { SendMailClient } from "zeptomail";

const client = new SendMailClient({
  url: process.env.ZEPTO_URL,
  token: process.env.ZEPTO_TOKEN,
});

const sendEmail = async ({
  to,
  name = "",
  subject = "",
  templateKey,
  mergeInfo = {},
}) => {
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  if (!templateKey) {
    throw new Error("Template key is required.");
  }

  if (
    !process.env.ZEPTO_FROM ||
    !process.env.ZEPTO_URL ||
    !process.env.ZEPTO_TOKEN
  ) {
    throw new Error("ZeptoMail configuration is incomplete.");
  }

  try {
    const response = await client.sendMailWithTemplate({
      mail_template_key: templateKey,

      from: {
        address: process.env.ZEPTO_FROM,
        name: "Live Agenda",
      },

      to: [
        {
          email_address: {
            address: to,
            name,
          },
        },
      ],

      subject,
      merge_info: mergeInfo,
    });

    return response;
  } catch (error) {
    console.error("ZeptoMail Error:", error.message);
    throw error;
  }
};

export default sendEmail;
