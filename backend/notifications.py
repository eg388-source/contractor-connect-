import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client

def send_email_sendgrid(api_key: str, from_email: str, to_email: str, subject: str, message: str):
    sg = SendGridAPIClient(api_key)
    mail = Mail(from_email=from_email, to_emails=to_email, subject=subject, plain_text_content=message)
    resp = sg.send(mail)
    return f"SendGrid status={resp.status_code}"

def send_sms_twilio(account_sid: str, auth_token: str, from_number: str, to_number: str, message: str):
    client = Client(account_sid, auth_token)
    msg = client.messages.create(body=message, from_=from_number, to=to_number)
    return f"Twilio sid={msg.sid}"

def try_send_notification(config, channel: str, to_value: str, subject: str, message: str):
    # Returns (status, provider_response)
    channel = (channel or "").lower().strip()
    if channel == "email":
        if config.SENDGRID_API_KEY and to_value and "@" in to_value:
            resp = send_email_sendgrid(config.SENDGRID_API_KEY, config.FROM_EMAIL, to_value, subject or "Notification", message)
            return ("sent", resp)
        return ("logged", "Email provider not configured (SENDGRID_API_KEY missing) or invalid recipient; logged only.")
    if channel == "sms":
        if config.TWILIO_ACCOUNT_SID and config.TWILIO_AUTH_TOKEN and config.TWILIO_FROM_NUMBER:
            resp = send_sms_twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, config.TWILIO_FROM_NUMBER, to_value, message)
            return ("sent", resp)
        return ("logged", "SMS provider not configured (Twilio env vars missing); logged only.")
    return ("failed", "Unknown channel; must be 'email' or 'sms'.")
