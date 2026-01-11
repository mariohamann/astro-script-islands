export const track = () => {
  // console.log("Tracking event: hover");

  const counter = document.getElementById("tracking-badge");
  if (counter) {
    const currentCount = parseInt(counter.textContent || "0");
    counter.textContent = String(currentCount + 1);
    counter.className = counter.className.replace("note", "success");
  }
}

