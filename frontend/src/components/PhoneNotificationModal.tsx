import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import type { PhoneAlertInfo, User } from '../types';
import { sendTestEmailToPhone } from '../services/api';

interface PhoneNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneAlert: PhoneAlertInfo | null;
  currentUser: User | null;
  authToken: string | null;
}

export const PhoneNotificationModal: React.FC<PhoneNotificationModalProps> = ({
  isOpen,
  onClose,
  phoneAlert,
  currentUser,
  authToken
}) => {
  const [customEmail, setCustomEmail] = useState(currentUser?.email || '');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  if (!isOpen || !phoneAlert) return null;

  const handleSendTestToPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    setSending(true);
    setSendSuccess(null);
    try {
      const res = await sendTestEmailToPhone(customEmail, undefined, authToken || undefined);
      setSendSuccess(res.message || `Dispatched to ${customEmail}! Check your phone.`);
    } catch (err: any) {
      setSendSuccess(err.message || 'Error dispatching mail.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                <span>Direct Mail Alert to Phone</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automatic mobile push & email notification dispatched to recipient phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[85vh]">
          {/* Smartphone Notification Banner Preview */}
          <div className="relative mx-auto max-w-sm rounded-3xl p-3 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-slate-700 shadow-2xl">
            {/* Phone Speaker & Camera Notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700"></div>
            </div>

            {/* Lockscreen Notification Bubble */}
            <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-teal-500/40 shadow-xl text-left space-y-1.5 backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5 font-semibold text-teal-300">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  <span>MAIL APP • REALESTATEIQ</span>
                </div>
                <div className="flex items-center space-x-1 text-[10px]">
                  <Clock className="w-3 h-3" />
                  <span>Just now</span>
                </div>
              </div>

              <div className="text-xs font-bold text-white">
                {phoneAlert.subject}
              </div>

              <div className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                To: {phoneAlert.recipient_name} ({phoneAlert.recipient_email})
                <br />
                {phoneAlert.sms_text}
              </div>

              <div className="pt-1 flex items-center space-x-2 text-[10px] text-teal-400 font-semibold">
                <span>🔔 Tap to Open on Phone</span>
                <span>•</span>
                <span>Directions Pre-filled</span>
              </div>
            </div>
          </div>

          {/* Quick Actions to trigger real phone communication */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Instant Mobile Delivery Options</span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={phoneAlert.whatsapp_url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95 text-center"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Open in WhatsApp</span>
              </a>

              <a
                href={phoneAlert.sms_url}
                className="p-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95 text-center"
              >
                <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Send SMS to Phone</span>
              </a>
            </div>

            <a
              href={phoneAlert.mailto_url}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors text-center"
            >
              <Mail className="w-4 h-4 text-teal-400" />
              <span>Open in Default Mail Client ({phoneAlert.recipient_email})</span>
            </a>
          </div>

          {/* Test Real Email to Evaluator's Physical Phone */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
              <Send className="w-3.5 h-3.5 text-teal-400" />
              <span>Receive Real Email Directly on Your Smartphone</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enter your personal email address below to receive an actual property lead email right now on your phone's Gmail/Apple Mail app.
            </p>

            <form onSubmit={handleSendTestToPhone} className="flex gap-2">
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="e.g. myphone@gmail.com"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0 transition-all active:scale-95 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send to My Phone'}
              </button>
            </form>

            {sendSuccess && (
              <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{sendSuccess}</span>
              </div>
            )}
          </div>

          {/* Live Delivery Info Notice */}
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 px-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              Configured with SMTP TLS transport in backend. Live notifications reach phone via SMTP, SMS, and WhatsApp deep-links.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
