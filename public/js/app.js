document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    // Allow forms marked to skip loading behavior
    if (form.dataset.noLoading === "true") {
      return;
    }

    const button = form.querySelector(
      'button[type="submit"], button:not([type])',
    );

    if (!button || button.dataset.noLoading === "true") {
      return;
    }

    // Prevent multiple submissions
    if (button.disabled) {
      event.preventDefault();
      return;
    }

    // Save the original button text
    button.dataset.original = button.innerHTML;

    // Disable the button and show loading
    button.disabled = true;

    button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Processing...
        `;
  });
});
