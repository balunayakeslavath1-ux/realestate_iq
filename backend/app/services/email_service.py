"""
RealEstateIQ Smartphone-Responsive Email Notification Service.
Sends immediate email notifications to property owners when a user likes or saves their flat.
Designed specifically with mobile-friendly action buttons so owners can read on their smartphone
and instantly call, WhatsApp, email, or navigate to the property.
"""

import smtplib
import logging
import urllib.parse
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

from backend.app.config import settings

logger = logging.getLogger("email_service")

def clean_phone_number(phone: Optional[str]) -> str:
    """Extract clean digits with country code for tel: and wa.me links."""
    if not phone:
        return ""
    digits = re.sub(r"[^\d+]", "", phone)
    if digits.startswith("+"):
        return digits
    if len(digits) == 10:
        return "+91" + digits
    return "+" + digits

def build_smartphone_responsive_email(
    owner_name: str,
    property_title: str,
    locality_name: str,
    price_formatted: str,
    property_type: str,
    listing_type: str,
    bedrooms: int,
    area_sqft: float,
    address: str,
    image_url: Optional[str],
    buyer_name: str,
    buyer_email: str,
    buyer_phone: Optional[str],
    nav_url: str
) -> str:
    """
    Constructs a mobile-optimized responsive HTML email card.
    Contains large 1-tap mobile action buttons (Call, WhatsApp, Email, Google Maps Directions)
    that work seamlessly on iOS Mail, Gmail for Android, and Samsung Mail.
    """
    clean_phone = clean_phone_number(buyer_phone) if buyer_phone else ""
    whatsapp_text = urllib.parse.quote(
        f"Hi {buyer_name}, I saw you saved my property '{property_title}' in {locality_name} on RealEstateIQ. Would you like to schedule a site visit?"
    )
    whatsapp_url = f"https://wa.me/{clean_phone.replace('+', '')}?text={whatsapp_text}" if clean_phone else "#"
    call_url = f"tel:{clean_phone}" if clean_phone else "#"
    mailto_url = f"mailto:{buyer_email}?subject={urllib.parse.quote(f'Regarding {property_title} on RealEstateIQ')}"

    hero_img = image_url or "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RealEstateIQ - New Buyer Lead</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-text-size-adjust: 100%;
    }}
    .email-container {{
      max-width: 600px;
      margin: 0 auto;
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
    }}
    .header {{
      background: linear-gradient(135deg, #0d9488 0%, #1e1b4b 100%);
      padding: 24px 20px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0 0;
      color: #99f6e4;
      font-size: 13px;
      font-weight: 500;
    }}
    .content {{
      padding: 24px 20px;
    }}
    .lead-banner {{
      background-color: #134e4a;
      border: 1px solid #2dd4bf;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }}
    .lead-banner h2 {{
      margin: 0 0 6px 0;
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
    }}
    .lead-banner p {{
      margin: 0;
      color: #ccfbf1;
      font-size: 13px;
      line-height: 1.4;
    }}
    .property-card {{
      background-color: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
      border: 1px solid #334155;
    }}
    .property-img {{
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }}
    .property-body {{
      padding: 16px;
    }}
    .property-title {{
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }}
    .specs-grid {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      margin-bottom: 12px;
    }}
    .spec-pill {{
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }}
    .buyer-box {{
      background-color: #1e293b;
      border: 1px solid #3b82f6;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
    }}
    .buyer-box h3 {{
      margin: 0 0 12px 0;
      color: #60a5fa;
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .buyer-row {{
      margin-bottom: 8px;
      font-size: 14px;
      color: #e2e8f0;
    }}
    .buyer-label {{
      color: #94a3b8;
      font-size: 12px;
      display: block;
      margin-bottom: 2px;
    }}
    .btn-grid {{
      margin-top: 20px;
      display: block;
    }}
    .action-btn {{
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 14px;
      margin-bottom: 10px;
      text-align: center;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      letter-spacing: 0.3px;
    }}
    .btn-call {{
      background-color: #10b981;
      color: #ffffff;
    }}
    .btn-whatsapp {{
      background-color: #22c55e;
      color: #ffffff;
    }}
    .btn-email {{
      background-color: #3b82f6;
      color: #ffffff;
    }}
    .btn-nav {{
      background-color: #0f172a;
      border: 1px solid #2dd4bf;
      color: #2dd4bf;
    }}
    .footer {{
      padding: 18px 20px;
      background-color: #090d16;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div style="padding: 12px;">
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <h1>RealEstateIQ Hyderabad</h1>
        <p>⚡ Instant Property Lead Notification</p>
      </div>

      <!-- Main Content -->
      <div class="content">
        <!-- Lead Banner -->
        <div class="lead-banner">
          <h2>Someone is interested in your property!</h2>
          <p>Hi {owner_name}, a prospective buyer/tenant just saved your listing to their favourites on RealEstateIQ.</p>
        </div>

        <!-- Property Snapshot -->
        <div class="property-card">
          <img src="{hero_img}" alt="{property_title}" class="property-img">
          <div class="property-body">
            <h3 class="property-title">{property_title}</h3>
            <div style="font-size: 13px; color: #94a3b8; margin-bottom: 8px;">
              📍 {locality_name}, Hyderabad • {address}
            </div>
            <div class="specs-grid">
              <span class="spec-pill">💰 <strong>{price_formatted}</strong></span>
              <span class="spec-pill">🛏️ <strong>{bedrooms} BHK</strong></span>
              <span class="spec-pill">📐 <strong>{area_sqft:,.0f} sq.ft</strong></span>
              <span class="spec-pill">🏷️ <strong>{property_type.title()}</strong> ({listing_type.upper()})</span>
            </div>
          </div>
        </div>

        <!-- Interested Buyer Info -->
        <div class="buyer-box">
          <h3>Interested Contact Details</h3>
          <div class="buyer-row">
            <span class="buyer-label">Interested User:</span>
            <strong style="color: #ffffff; font-size: 15px;">{buyer_name}</strong>
          </div>
          <div class="buyer-row">
            <span class="buyer-label">Email Address:</span>
            <span style="color: #93c5fd;">{buyer_email}</span>
          </div>
          <div class="buyer-row">
            <span class="buyer-label">Phone Number:</span>
            <span style="color: #6ee7b7; font-weight: 600;">{buyer_phone or "Withheld for initial inquiry"}</span>
          </div>
        </div>

        <!-- Smartphone Action Buttons -->
        <div class="btn-grid">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; text-align: center;">
            Contact the user immediately from your phone:
          </div>

          {f'<a href="{call_url}" class="action-btn btn-call">📞 Call Buyer ({buyer_phone})</a>' if clean_phone else ''}
          {f'<a href="{whatsapp_url}" class="action-btn btn-whatsapp">💬 Message on WhatsApp</a>' if clean_phone else ''}
          <a href="{mailto_url}" class="action-btn btn-email">✉️ Send Email to Buyer</a>
          <a href="{nav_url}" class="action-btn btn-nav">🗺️ Open in Google Maps</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>This automated lead alert was dispatched by RealEstateIQ.<br>
        You are receiving this because your property is registered on the platform.</p>
      </div>
    </div>
  </div>
</body>
</html>"""
    return html


def send_immediate_owner_notification(
    owner_email: str,
    owner_name: str,
    property_title: str,
    locality_name: str,
    price_formatted: str,
    property_type: str,
    listing_type: str,
    bedrooms: int,
    area_sqft: float,
    address: str,
    image_url: Optional[str],
    buyer_name: str,
    buyer_email: str,
    buyer_phone: Optional[str],
    nav_url: str
) -> Dict[str, Any]:
    """
    Dispatches immediate email notification to the owner's smartphone.
    Uses SMTP TLS if configured in backend config, or logs the structured delivery.
    """
    subject = f"RealEstateIQ Lead Alert: {buyer_name} saved '{property_title}' ({locality_name})"

    plain_text = (
        f"Hi {owner_name},\n\n"
        f"Good news! A prospective buyer/tenant has saved your property on RealEstateIQ.\n\n"
        f"--- PROPERTY ---\n"
        f"Title: {property_title}\n"
        f"Locality: {locality_name}, Hyderabad\n"
        f"Price: {price_formatted}\n"
        f"Details: {bedrooms} BHK | {area_sqft:,.0f} sq.ft\n"
        f"Google Maps: {nav_url}\n\n"
        f"--- INTERESTED USER ---\n"
        f"Name: {buyer_name}\n"
        f"Email: {buyer_email}\n"
        f"Phone: {buyer_phone or 'Withheld'}\n\n"
        f"You can contact them directly from your phone to arrange a viewing.\n\n"
        f"Best regards,\n"
        f"RealEstateIQ Alert System"
    )

    html_content = build_smartphone_responsive_email(
        owner_name=owner_name,
        property_title=property_title,
        locality_name=locality_name,
        price_formatted=price_formatted,
        property_type=property_type,
        listing_type=listing_type,
        bedrooms=bedrooms,
        area_sqft=area_sqft,
        address=address,
        image_url=image_url,
        buyer_name=buyer_name,
        buyer_email=buyer_email,
        buyer_phone=buyer_phone,
        nav_url=nav_url
    )

    # Check if SMTP credentials are provided
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject

            # Determine From header: for Gmail, address must match authenticated user
            from_email = settings.SMTP_USER if "@gmail.com" in settings.SMTP_USER.lower() else (settings.SMTP_FROM or settings.SMTP_USER)
            msg["From"] = f"RealEstateIQ Alert <{from_email}>"
            msg["To"] = owner_email
            msg["Reply-To"] = buyer_email

            part1 = MIMEText(plain_text, "plain", "utf-8")
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            # SSL (port 465) vs STARTTLS (port 587)
            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
                if settings.SMTP_USE_TLS:
                    server.starttls()

            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(from_email, [owner_email], msg.as_string())
            server.quit()

            logger.info("Email delivered via SMTP to %s", owner_email)
            return {
                "status": "delivered_smtp",
                "message": f"Real email dispatched via live SMTP to {owner_email} on their smartphone!",
                "recipient": owner_email
            }
        except smtplib.SMTPAuthenticationError as auth_err:
            error_hint = str(auth_err)
            if "gmail.com" in settings.SMTP_HOST.lower():
                error_hint += " (Tip: Gmail requires a 16-character App Password. Visit https://myaccount.google.com/apppasswords to create one)"
            logger.error("SMTP Auth Error: %s", error_hint)
            return {
                "status": "auth_failed",
                "message": f"SMTP Authentication failed: {error_hint}",
                "recipient": owner_email
            }
        except Exception as e:
            logger.error("SMTP delivery failed: %s. Logging delivery.", e)
            return {
                "status": "smtp_error",
                "message": f"SMTP transmission failed: {str(e)}",
                "recipient": owner_email
            }

    # If no SMTP configured, log cleanly
    logger.info("Mock Email dispatched to %s with subject '%s'", owner_email, subject)
    return {
        "status": "delivered_mock",
        "message": f"Delivered to {owner_email} (Mock delivery recorded in audit log. Configure SMTP in Admin to ping physical phones)",
        "recipient": owner_email
    }
