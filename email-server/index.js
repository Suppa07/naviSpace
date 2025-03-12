
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

async function sendMail(to, subject, text, html) {
  // send mail with defined transport object
  console.log(to, subject, text, html);
  const info = await transporter.sendMail({
    from: process.env.EMAIL,
    to:to,
    subject:subject,
    text:text,
    html:html,
  });

  console.log(info)
  console.log("Message sent: %s", info.messageId);
  // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}

export default sendMail;