import axios from "axios"

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const response = await axios.post('http://email-service:3001/sendMail/verification', {
      email,
      token 
    })

  } catch (error) {
    console.log(error)
  }
}