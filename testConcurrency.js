const URL = "http://localhost:5000/api/v1/chat/complete";

const payload = {
  key: "89d576cf07b907fd0ced43ef98539ae7021e13b9622e39663372bd539252cbf8",
  llmModel: "gemini-3.5-flash-lite",
  question: "What would be one word answer of Hey"
};

async function sendRequest(name) {
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  console.log(name, response.status, data);
}

Promise.all([
  sendRequest("Request A"),
  sendRequest("Request B"),
  sendRequest("Request C"),
  sendRequest("Request D"),
  sendRequest("Request E"),
  sendRequest("Request F"),
  sendRequest("Request G")
]).catch(console.error);