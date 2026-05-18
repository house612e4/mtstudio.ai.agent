exports.handler = async function (event, context) {
  try {
    // আপনার এআই এজেন্টের লজিক বা এপিআই কল এখানে হবে
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "AI Agent active and responding securely." }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};