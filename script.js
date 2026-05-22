let currentUser = "Person 1";

function setUser(user) {
  currentUser = user;
  document.getElementById("currentUser").innerText =
    "Current User: " + currentUser;
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value;

  if (message.trim() === "") return;

  const chatBox = document.getElementById("chatBox");

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  if (currentUser === "Person 1") {
    messageDiv.classList.add("person1");
  } else {
    messageDiv.classList.add("person2");
  }

  messageDiv.innerHTML = `<strong>${currentUser}:</strong> ${message}`;

  chatBox.appendChild(messageDiv);

  input.value = "";

  chatBox.scrollTop = chatBox.scrollHeight;
}