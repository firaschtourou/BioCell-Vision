# app/services/email_service.py
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging
import ssl

logger = logging.getLogger(__name__)

class EmailService:
    async def send_reset_code(self, recipient_email: str, reset_code: str) -> bool:
        """Envoie le code de réinitialisation par email"""
        try:
            # Création du message
            msg = MIMEMultipart()
            msg['From'] = settings.MAIL_USERNAME
            msg['To'] = recipient_email
            msg['Subject'] = "Code de réinitialisation - BioCellVision"
            
            # Corps du message en HTML
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
                    <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                    <p>Votre code de vérification est :</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #4CAF50;">
                        {reset_code}
                    </div>
                    <p style="margin-top: 20px;">Ce code expire dans 15 minutes.</p>
                    <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                    <hr>
                    <p style="color: #777;">BioCellVision Team</p>
                </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            # Configuration SMTP corrigée pour Gmail
            logger.info(f"📧 Tentative d'envoi d'email à {recipient_email}")
            
            # Utilisation de STARTTLS explicitement (port 587)
            # Ne pas utiliser use_tls=True car cela force SMTPS (port 465)
            await aiosmtplib.send(
                msg,
                hostname=settings.MAIL_SERVER,
                port=settings.MAIL_PORT,  # 587
                username=settings.MAIL_USERNAME,
                password=settings.MAIL_PASSWORD,
                use_tls=False,  # Important: False pour utiliser STARTTLS sur le port 587
                start_tls=True,  # Activer STARTTLS après connexion initiale
                timeout=30
            )
            
            logger.info(f"✅ Email envoyé avec succès à {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email: {e}")
            
            # Tentative alternative si la première échoue
            try:
                logger.info("Tentative alternative avec configuration différente...")
                
                # Deuxième tentative avec paramètres différents
                await aiosmtplib.send(
                    msg,
                    hostname=settings.MAIL_SERVER,
                    port=465,  # Port SSL direct
                    username=settings.MAIL_USERNAME,
                    password=settings.MAIL_PASSWORD,
                    use_tls=True,  # SSL direct
                    start_tls=False,
                    timeout=30
                )
                
                logger.info(f"✅ Email envoyé (tentative alternative) à {recipient_email}")
                return True
                
            except Exception as e2:
                logger.error(f"❌ Échec deuxième tentative: {e2}")
                return False

email_service = EmailService()