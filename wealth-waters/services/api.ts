const LMS_BASE_URL = 'https://sales.bajajlife.com/BalicLmsUtil';

export interface LMSLeadData {
  name?: string;
  fullName?: string;
  mobile_no?: string;
  email_id?: string;
  date?: string;
  timeSlot?: string;
  score?: number;
  summary_dtls?: string;
}

export const submitToLMS = async (data: LMSLeadData): Promise<{ success: boolean; data?: any; error?: string }> => {
  const UAT_URL = `${LMS_BASE_URL}/whatsappInhouse`;

  const userId = sessionStorage.getItem('gamification_userId') || '';
  const gameID = sessionStorage.getItem('gamification_gameId') || 'GAME_034';

  let appointmentDate = "";
  if (data.date) {
    const d = new Date(data.date);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      appointmentDate = `${day}/${month}/${year}`;
    }
  }

  const payload = {
    cust_name: data.name || data.fullName || "",
    mobile_no: data.mobile_no || "",
    dob: "",
    gender: "M",
    pincode: "",
    email_id: data.email_id || "",
    life_goal_category: "",
    investment_amount: "",
    product_id: "",
    p_source: sessionStorage.getItem('gamification_referral') === 'Y' ? 'Referral' : 'Marketing Assist',
    p_data_source: "GAMIFICATION",
    pasa_amount: "",
    product_name: "",
    pasa_product: "",
    associated_rider: "",
    customer_app_product: "",
    p_data_medium: " GAMIFICATION ",
    utmSource: "",
    userId: userId,
    gameID: gameID,
    remarks: `Game: ${gameID}${data.score != null ? ` | Score: ${data.score}` : ''} | ${data.summary_dtls || "Lead"}`,
    appointment_date: appointmentDate,
    appointment_time: data.timeSlot || ""
  };

  console.log("[API] Submitting lead to WhatsApp Inhouse API:", payload);

  try {
    const response = await fetch(UAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));
    if (response.ok && responseData?.leadNo) {
      sessionStorage.setItem('wealthWatersLeadNo', responseData.leadNo);
    }

    return {
      success: response.ok,
      data: responseData,
      error: response.ok ? null : (responseData?.message || `API error: ${response.status}`)
    };
  } catch (error: any) {
    console.error("LMS Submission Error Details:", error);
    return { success: false, error: error.message };
  }
};

export interface UpdateLeadData {
  name?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  date?: string;
  time?: string;
  remarks?: string;
}

export const updateLeadNew = async (leadNo: string, data: UpdateLeadData): Promise<{ success: boolean; error?: string; [key: string]: any }> => {
  const UAT_URL = `${LMS_BASE_URL}/updateLeadNew`;

  const payload = {
    leadNo: leadNo,
    tpa_user_id: "",
    miscObj1: {
      stringval1: "",
      stringval2: data.name || data.firstName || "",
      stringval3: data.lastName || "",
      stringval4: data.date || "",
      stringval5: data.time || "",
      stringval6: data.remarks || "Slot Booking via Game",
      stringval7: "GAMIFICATION",
      stringval9: data.mobile || ""
    }
  };

  console.log("[API] Submitting slot booking to updateLeadNew API:", payload);

  try {
    const response = await fetch(UAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const jsonResponse = await response.json().catch(() => ({}));
    return {
      success: response.ok,
      ...jsonResponse
    };
  } catch (error: any) {
    console.error("updateLeadNew Submission Error:", error);
    return { success: false, error: error.message };
  }
};
