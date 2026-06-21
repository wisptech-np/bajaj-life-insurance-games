// LMS integration for Stackibility Stack (Synchronized with Snake-Life)
const LMS_BASE_URL = __LMS_BASE_URL__;
const LMS_UPDATE_BASE_URL = __LMS_UPDATE_BASE_URL__;

export async function submitToLMS(data) {
  const UAT_URL = `${LMS_BASE_URL}/whatsappInhouse`;
  const userId = sessionStorage.getItem('gamification_userId') || '';
  const gameID = sessionStorage.getItem('gamification_gameId') || '';

  // Format date if present (expected DD/MM/YYYY)
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
    mobile_no: data.mobile || data.mobile_no || "",
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
    remarks: `Game: ${gameID}${data.score != null ? ` | Score: ${data.score}` : ''} | ${data.summary_dtls || "Stackibility Stack Lead"}`,
    appointment_date: appointmentDate,
    appointment_time: data.timeSlot || ""
  };

  try {
    const response = await fetch(UAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const responseData = await response.json().catch(() => ({}));
    return {
      success: response.ok,
      data: responseData,
      error: response.ok ? null : (responseData?.message || `API error: ${response.status}`)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateLeadNew(leadNo, data) {
  const UAT_URL = `${LMS_UPDATE_BASE_URL}/updateLeadNew`;
  
  let formattedDate = '';
  if (data.date) {
    const parts = data.date.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      formattedDate = data.date;
    }
  }

  const payload = {
    leadNo: leadNo,
    tpa_user_id: "",
    miscObj1: {
      stringval1: "",
      stringval2: data.name || "",
      stringval3: "",
      stringval4: formattedDate,
      stringval5: data.time || "",
      stringval6: data.remarks || "Slot Booking via Stackibility Stack",
      stringval7: "GAMIFICATION",
      stringval9: data.mobile || ""
    }
  };

  try {
    const response = await fetch(UAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const jsonResponse = await response.json().catch(() => ({}));
    return { success: response.ok, ...jsonResponse };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

