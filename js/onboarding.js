const ONBOARDING_STORAGE_KEY = "tatekae-note-onboarding-completed";
const SLIDE_DURATION = 3000;
const FADE_DURATION = 600;
const SLIDES = [
  "../assets/onboarding/slide-1.png",
  "../assets/onboarding/slide-2.png",
  "../assets/onboarding/slide-3.png",
  "../assets/onboarding/slide-4.png"
];

function hasCompletedOnboarding() {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function isPreviewMode() {
  const hashQuery = window.location.hash.split("?")[1] || "";
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(hashQuery);
  return searchParams.get("onboarding") === "preview"
    || hashParams.get("onboarding") === "preview";
}

function markOnboardingCompleted() {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch (error) {
    // localStorageが使えない環境でも、通常画面へ進める。
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function preloadSlides() {
  const images = await Promise.all(SLIDES.map(loadImage));
  return images.map((image) => image.src);
}

function createOnboardingElement(imageSources) {
  const overlay = document.createElement("section");
  overlay.className = "onboarding-overlay";
  overlay.setAttribute("aria-label", "タテカエNOTEの紹介");
  overlay.innerHTML = `
    <div class="onboarding-visual">
      <img class="onboarding-image is-active" src="${imageSources[0]}" alt="タテカエNOTEの紹介スライド1">
    </div>
    <button class="onboarding-skip" type="button">スキップ</button>
    <div class="onboarding-controls">
      <div class="onboarding-dots" aria-hidden="true">
        ${imageSources.map((source, index) => `<span class="onboarding-dot${index === 0 ? " is-active" : ""}"></span>`).join("")}
      </div>
      <button class="onboarding-start" type="button" hidden>はじめる</button>
    </div>`;

  return overlay;
}

function createSlideController(overlay, imageSources, finish, shouldPersist) {
  const image = overlay.querySelector(".onboarding-image");
  const dots = [...overlay.querySelectorAll(".onboarding-dot")];
  const skipButton = overlay.querySelector(".onboarding-skip");
  const startButton = overlay.querySelector(".onboarding-start");
  let currentIndex = 0;
  let timerId;
  let isChanging = false;

  function updateControls() {
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
    });
    startButton.hidden = currentIndex !== imageSources.length - 1;
    skipButton.hidden = currentIndex === imageSources.length - 1;
  }

  function scheduleNext() {
    window.clearTimeout(timerId);
    if (currentIndex < imageSources.length - 1) {
      timerId = window.setTimeout(() => showNextSlide(), SLIDE_DURATION);
    }
  }

  function showNextSlide() {
    if (isChanging || currentIndex >= imageSources.length - 1) {
      return;
    }

    isChanging = true;
    currentIndex += 1;
    image.classList.remove("is-active");

    window.setTimeout(() => {
      image.src = imageSources[currentIndex];
      image.alt = `タテカエNOTEの紹介スライド${currentIndex + 1}`;
      updateControls();
      image.classList.add("is-active");
      isChanging = false;
      scheduleNext();
    }, FADE_DURATION / 2);
  }

  function complete() {
    window.clearTimeout(timerId);
    if (shouldPersist) {
      markOnboardingCompleted();
    }
    finish();
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest(".onboarding-visual")) {
      showNextSlide();
    }
  });
  skipButton.addEventListener("click", complete);
  startButton.addEventListener("click", complete);
  updateControls();
  scheduleNext();
}

export async function showOnboarding() {
  const preview = isPreviewMode();

  if (!preview && hasCompletedOnboarding()) {
    return;
  }

  try {
    const imageSources = await preloadSlides();
    const overlay = createOnboardingElement(imageSources);
    document.body.appendChild(overlay);

    await new Promise((resolve) => {
      createSlideController(overlay, imageSources, () => {
        overlay.remove();
        if (preview) {
          window.location.hash = "#/home";
        }
        resolve();
      }, !preview);
    });
  } catch (error) {
    console.warn("Onboarding images could not be loaded", error);
  }
}
