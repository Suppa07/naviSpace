import express from 'express'
import jwt from 'jsonwebtoken'
import sendMail from './index.js'
import cors from 'cors'
import dotenv from 'dotenv'

const app = express()
app.use(cors({
    origin:['http://localhost:3000','http://localhost:5000'],
    credentials:true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post('/send-verification-mail', async (req,res) =>{
    try {
        const {email} = req.body
        const token = jwt.sign({email},process.env.JWT_SECRET,{expiresIn:"1d"});
        const link = `http://localhost:5001/verify-email?token=${token}`
        const subject = "Verify your email"
        const text = `Click this link to verify your email: ${link}`
        const html = `<p>Click <a href="${link}">here</a> to verify your email</p>`
        await sendMail(email,subject,text,html)
        res.status(200).json({message:"Verification email sent"})
    } catch (error) {
        res.status(500).json({message:"Internal server error"})
    }
})

app.get('/verify-email', async (req,res) =>{

    try {
        console.log("here")
        const {token} = req.query;
        const {email} = jwt.verify(token,process.env.JWT_SECRET)
        if(!email){
            return res.status(400).json({message:"Invalid token"})
        }

        const response = await fetch('http://localhost:3000/auth/verify-email',{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({email,verified:true})
        }).then(res => res.json())
        if(!response.success){
            return res.status(400).json({success:false,message:"Email verification failed"})
        }
        res.status(200).json({success:true,message:"Email verified"})
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false,message:"Internal server error"});
    }
})


app.post('/send-reset-password-mail', async (req,res) =>{
    try {
        const {email} = req.body
        const token = jwt.sign({email},process.env.JWT_SECRET,{expiresIn:"1d"});
        const link = `http://localhost:3000/reset-password?token=${token}`
        const subject = "Reset your password"
        const text = `Click this link to reset your password: ${link}`
        const html = `<p>Click <a href="${link}">here</a> to reset your password</p>`
        await sendMail(email,subject,text,html)
        res.status(200).json({message:"Reset password email sent"})
    } catch (error) {
        res.status(500).json({message:"Internal server error"})
    }
})


app.get('/reset-password', async (req,res) =>{
    try {
        const {token} = req.query;
        const {email} = jwt.verify(token,process.env.JWT_SECRET)
        if(!email){
            return res.status(400).json({message:"Invalid token"})
        }
        res.status(200).json({success:true,message:"Email verified"})
    } catch (error) {
        res.status(500).json({success:false,message:"Internal server error"});
    }
})

app.post('/send-bulk-notification', async (req,res) =>{
    try {
        const {emails,subject,text,html} = req.body
        for(let i=0;i<emails.length;i++){
            await sendMail(emails[i],subject,text,html)
        }
        res.status(200).json({message:"Bulk notification sent"})
    } catch (error) {
        res.status(500).json({message:"Internal server error"})
    }
})

app.post('/send-notification-to-admin', async(req,res) =>{
    try {
        const {to,subject,text,html} = req.body
        console.log(html)
        await sendMail(to,subject,text,html)
        res.status(200).json({message:"Notification sent to admin"})
    } catch (error) {
        res.status(500).json({message:"Internal server error"})
    }
})

app.post('/send-notification-to-user', async(req,res) =>{
    try {
        const {user,subject,text,html} = req.body
        await sendMail(user,subject,text,html)
        res.status(200).json({message:"Notification sent to users"})
    } catch (error) {
        res.status(500).json({message:"Internal server error"})
    }
})


app.listen(5001,()=>{
    console.log("Email server running on port 5001");
})