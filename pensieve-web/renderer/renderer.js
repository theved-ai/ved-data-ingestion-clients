document.getElementById('recordBtn').addEventListener('click', async () => {
  const transcript = await window.electronAPI.startRecording();
  document.getElementById('transcript').innerText = transcript;
});