document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitButton = document.getElementById("contact-submit");
  const status = document.getElementById("contact-status");

  if (!form || !submitButton || !status || !window.emailjs) return;

  const serviceId = "service_gfggcim";
  const templateId = "template_5v3ozsn";
  const publicKey = "-Lky0__NI_PQwNmYn";

  emailjs.init(publicKey);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    status.textContent = "送信中...";

    try {
      await emailjs.sendForm(serviceId, templateId, form);
      form.reset();
      status.textContent = "送信しました。ありがとうございます！";
    } catch (error) {
      status.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
    } finally {
      submitButton.disabled = false;
    }
  });
});
