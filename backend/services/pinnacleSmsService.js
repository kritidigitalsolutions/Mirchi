const axios = require("axios");

const PINNACLE_API_URL = process.env.PINNACLE_API_URL;
const ACCESS_KEY = process.env.PINNACLE_ACCESS_KEY;
const HEADER = process.env.PINNACLE_HEADER;
const DLT_ENTITY_ID = process.env.PINNACLE_DLT_ENTITY_ID;
const DLT_TEMPLATE_ID = process.env.PINNACLE_DLT_TEMPLATE_ID;

// Template 2
function buildOtpMessage(otp) {
  return `${otp} is your Login OTP for https://mirchiapp.in/whitemultimedia/signin`;
}

async function sendOtpSms(mobileNumber, otp) {
  if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
    return {
      success: false,
      error: "Invalid mobile number format. Expected 10 digits.",
    };
  }

  const payload = {
    version: process.env.PINNACLE_API_VERSION,
    accesskey: ACCESS_KEY,
    encrypt: process.env.PINNACLE_ENCRYPT,
    messages: [
      {
        dest: [mobileNumber],
        msg: buildOtpMessage(otp),
        type: process.env.PINNACLE_TYPE,
        header: HEADER,
        app_country: process.env.PINNACLE_APP_COUNTRY,
        country_cd: process.env.PINNACLE_COUNTRY_CODE,
        dlt_entity_id: DLT_ENTITY_ID,
        dlt_template_id: DLT_TEMPLATE_ID,
      },
    ],
  };

  try {
    console.log("\n================ PINNACLE REQUEST ================\n");
    console.log(JSON.stringify(payload, null, 2));

    const response = await axios.post(
      PINNACLE_API_URL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );

    console.log("\n================ PINNACLE RESPONSE ================\n");
    console.log("HTTP Status:", response.status);
    console.log(JSON.stringify(response.data, null, 2));

    const data = response.data;

    if (data?.status?.code === "200") {
      console.log("\n✅ SMS ACCEPTED BY PINNACLE\n");

      return {
        success: true,
        reqId: data.req_id,
        raw: data,
      };
    }

    console.log("\n❌ PINNACLE REJECTED THE REQUEST\n");

    return {
      success: false,
      error: data?.status?.reason || "Unknown Pinnacle Error",
      raw: data,
    };
  } catch (err) {
    console.log("\n================ PINNACLE ERROR ================\n");

    if (err.response) {
      console.log("HTTP Status:", err.response.status);
      console.log(JSON.stringify(err.response.data, null, 2));
    } else {
      console.log(err.message);
    }

    return {
      success: false,
      error:
        err.response?.data?.status?.reason ||
        err.message ||
        "Network Error",
      raw: err.response?.data,
    };
  }
}

module.exports = {
  sendOtpSms,
  buildOtpMessage,
};