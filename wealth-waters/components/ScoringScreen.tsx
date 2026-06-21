import React, { useState } from "react";
import {
  CALL_NOW_NUMBER,
  COMPANY_NAME,
  DISCLAIMER,
  ORANGE,
  SCORE_MESSAGES,
  THANK_YOU_BODY,
} from "../constants";
import { submitToLMS, updateLeadNew } from "../services/api";
import { GameResult } from "../types";
import { buildShareUrl } from "../utils/crypto";
import { shortenUrl } from "../utils/shortener";
import BookSlotModal from "./BookSlotModal";
import Speedometer from "./Speedometer";

interface Props {
  result: GameResult;
  playerName: string;
  playerMobile: string;
  onPlayAgain: () => void;
}

const ScoringScreen: React.FC<Props> = ({
  result,
  playerName,
  playerMobile,
  onPlayAgain,
}) => {
  const [showBook, setShowBook] = useState(false);
  const [booked, setBooked] = useState(false);

  const finalScore = Math.min(100, Math.max(0, result.rawScore));
  const msg =
    SCORE_MESSAGES.find((m) => finalScore >= m.minScore) ??
    SCORE_MESSAGES[SCORE_MESSAGES.length - 1];

  const empPhone =
    sessionStorage.getItem("gamification_emp_mobile") || CALL_NOW_NUMBER;

  let tagline = "";
  if (finalScore <= 50) {
    tagline =
      "Oh no... Risk waves swept your capital away! Build a stronger shelter.";
  } else if (finalScore < 90) {
    tagline =
      "Well played! You secured important assets but some tax leaks and medical debt sharks caught you.";
  } else {
    tagline =
      "Fantastic! You navigated the deep ocean, avoided the hazards, and fully protected your wealth!";
  }

  const handleShare = async () => {
    const rawUrl = buildShareUrl() || window.location.href;
    const shareUrl = (await shortenUrl(rawUrl)) || rawUrl;
    const shareText = `Hi,

I challenge you to beat my score of ${finalScore}% in Wealth Waters: Insurance Fishing Adventure! Check how many protection assets you can harvest and how many financial leaks you can dodge. Play now: ${shareUrl}

Regards,
${playerName}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Wealth Waters Score",
          text: shareText,
        });
      } catch (e) {
        console.warn("Share failed", e);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert("Score and challenge link copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  const handleBook = async (booking: {
    name: string;
    mobile: string;
    date: string;
    time: string;
  }) => {
    const leadNo = sessionStorage.getItem("wealthWatersLeadNo");
    if (leadNo) {
      await updateLeadNew(leadNo, {
        firstName: booking.name,
        mobile: booking.mobile,
        date: booking.date,
        time: booking.time,
        remarks: `Wealth Waters Booking | Score: ${finalScore}%`,
      });
    } else {
      await submitToLMS({
        name: booking.name,
        mobile_no: booking.mobile,
        date: booking.date,
        timeSlot: booking.time,
        score: finalScore,
        summary_dtls: "Wealth Waters Booking",
      });
    }
    setBooked(true);
  };

  if (booked) {
    return (
      <div
        className="screen-scroll flex min-h-full flex-col items-center justify-center px-[6vw] py-[6vh] text-center"
        style={{
          background: "linear-gradient(135deg, #091e3d 0%, #030712 100%)",
        }}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-400 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-emerald-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="pop text-[clamp(2.4rem,10vw,3.2rem)] font-black text-white leading-none">
          THANK YOU!
        </h2>
        <h3
          className="pop mb-[1.2rem] mt-[0.6rem] text-[clamp(1.2rem,6vw,1.6rem)] font-extrabold"
          style={{ color: ORANGE }}
        >
          {playerName.toUpperCase()}
        </h3>
        <p className="mb-[2.4rem] max-w-[20rem] text-sm leading-relaxed text-blue-100/80">
          {THANK_YOU_BODY ||
            "Your appointment slot is confirmed! Our financial representative will connect with you soon to assist you with customized insurance policies."}
        </p>
        <button
          onClick={onPlayAgain}
          className="btn-press rounded-full px-[3.5rem] py-[1rem] text-[0.95rem] font-black tracking-wide text-white transition-all"
          style={{
            background: ORANGE,
            boxShadow: "0 0.5rem 1.5rem rgba(242,101,34,0.45)",
          }}
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  return (
    <div
      className="screen-scroll"
      style={{
        position: "relative",
        background: "linear-gradient(135deg, #0b1329 0%, #030712 100%)",
        height: "100%",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {showBook && (
          <BookSlotModal
            name={playerName}
            mobile={playerMobile}
            onClose={() => setShowBook(false)}
            onBook={handleBook}
          />
        )}

        {/* Header Title */}
        <div
          className="px-6 pb-2 text-center"
          style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
        >
          <h2 className="text-xl font-black text-white font-sans uppercase tracking-wider">
            Hi {playerName}!
          </h2>
          <p className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase mt-1">
            Wealth Protection Report Card
          </p>
        </div>

        {/* Premium Speedometer Area */}
        <div className="flex flex-col items-center justify-center my-2">
          <Speedometer score={finalScore} />
        </div>

        {/* Feedback details */}
        <div className="mx-5 px-5 py-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur">
          <h4 className="text-sm font-black text-yellow-400 tracking-wide uppercase font-sans mb-1.5">
            {msg.title}
          </h4>
          <p className="text-[0.78rem] leading-normal text-blue-100/90 font-medium mb-3">
            {msg.body}
          </p>
          <p className="text-[0.78rem] leading-normal text-white font-bold italic">
            "{tagline}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 px-5 py-4 mt-auto">
          {/* Share Challenge */}
          <button
            className="btn-press w-full rounded-2xl py-3.5 text-sm font-black text-white transition-all"
            style={{
              background: "#25D366",
              boxShadow: "0 4px 14px rgba(37,211,102,0.3)",
            }}
            onClick={handleShare}
          >
            Share Challenge
          </button>

          <p className="text-center text-xs leading-normal text-blue-300 font-semibold px-2">
            Secure your real life savings against sudden health crises and
            market drifts. Connect with us now!
          </p>

          <div className="rounded-2xl p-4 bg-blue-950/70 border border-blue-900/40">
            {empPhone && (
              <a
                href={`tel:${empPhone}`}
                className="btn-press mb-3 flex w-full items-center justify-center rounded-xl py-3 text-sm font-black text-white text-center transition-all"
                style={{
                  background: ORANGE,
                  boxShadow: "0 4px 12px rgba(242,101,34,0.35)",
                }}
              >
                Call Relationship Manager
              </a>
            )}
            <button
              onClick={() => setShowBook(true)}
              className="btn-press w-full rounded-xl py-3 text-sm font-black text-white transition-all"
              style={{
                background: "#0D9488",
                boxShadow: "0 4px 12px rgba(13,148,136,0.35)",
              }}
            >
              Book an Appointment
            </button>
          </div>

          {/* Reset / Play Again */}
          <button
            onClick={onPlayAgain}
            className="btn-press w-full rounded-xl py-3 text-sm font-black border border-white/20 text-white bg-white/5 transition-all"
          >
            Play Again
          </button>
        </div>

        {/* Disclaimer section */}
        <p
          className="px-5 text-[8.5px] leading-relaxed text-gray-500 text-center py-4"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          DISCLAIMER:{" "}
          {DISCLAIMER ||
            `Insurance is the subject matter of solicitation. The values displayed in this simulator are indicative. Consult a licensed financial advisor before making purchase decisions. ${COMPANY_NAME.toUpperCase()} does not assume liabilities.`}
        </p>
      </div>
    </div>
  );
};

export default ScoringScreen;
