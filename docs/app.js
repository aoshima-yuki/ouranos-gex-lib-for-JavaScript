(() => {
  const DEFAULT_LAT = 35.73004672351672;
  const DEFAULT_LNG = 139.7474538411047;
  const DEFAULT_ZOOM = 20;
  const MIN_ALT = -33554432;
  const MAX_ALT = 33554432;
  const MIN_LAT = -85.05112878;
  const MAX_LAT = 85.05112878;
  const MIN_LNG = -180;
  const MAX_LNG = 180;
  const MIN_Z = 0;
  const MAX_Z = 35;

  const messages = {
    ja: {
      libraryMissing: "ライブラリが読み込めていません。",
      mapMissing: "地図ライブラリが読み込めていません。",
      invalidLat: `緯度は ${MIN_LAT} ～ ${MAX_LAT} の範囲で入力してください。`,
      invalidLng: `経度は ${MIN_LNG} ～ ${MAX_LNG} の範囲で入力してください。`,
      invalidAlt: `標高は ${MIN_ALT} ～ ${MAX_ALT} m の範囲で入力してください。`,
      invalidZoom: `ズームレベルは ${MIN_Z} ～ ${MAX_Z} の整数で入力してください。`,
      invalidInput: "入力値を確認してください。",
      calcError: "計算中にエラーが発生しました。"
    },
    en: {
      libraryMissing: "Spatial ID library is not loaded.",
      mapMissing: "Map library is not loaded.",
      invalidLat: `Latitude must be between ${MIN_LAT} and ${MAX_LAT}.`,
      invalidLng: `Longitude must be between ${MIN_LNG} and ${MAX_LNG}.`,
      invalidAlt: `Altitude must be between ${MIN_ALT} and ${MAX_ALT} meters.`,
      invalidZoom: `Zoom level must be an integer between ${MIN_Z} and ${MAX_Z}.`,
      invalidInput: "Please check the input values.",
      calcError: "An error occurred during calculation."
    }
  };

  const translations = {
    ja: {
      pageTitle: "空間ID試行環境",
      inputTitle: "入力",
      inputDesc: "緯度・経度・標高・ズームレベルを入力します。",
      latLabel: "緯度（度）",
      lngLabel: "経度（度）",
      altLabel: "標高（m）",
      zoomLabel: "ズームレベル",
      calcButton: "計算",
      resultTitle: "出力",
      resultDesc: "算出された空間ID（z/f/x/y）を表示します。",
      resultLabel: "空間ID",
      mapTitle: "地図",
      mapDesc: "空間ボクセルを2Dで表示します。",
      linksTitle: "関連情報",
      guidelineLink: "4次元時空間情報利活用のための空間IDガイドライン",
      repoLink: "Open Data Spaces 4次元時空間ID 関連リポジトリ",
      footerNote: "本画面は試行環境です。表示結果は利用者の責任においてご確認ください。"
    },
    en: {
      pageTitle: "Spatial ID Demo",
      inputTitle: "Input",
      inputDesc: "Enter latitude, longitude, altitude, and zoom level.",
      latLabel: "Latitude (deg)",
      lngLabel: "Longitude (deg)",
      altLabel: "Altitude (m)",
      zoomLabel: "Zoom level",
      calcButton: "Calculate",
      resultTitle: "Output",
      resultDesc: "Displays the calculated Spatial ID (z/f/x/y).",
      resultLabel: "Spatial ID",
      mapTitle: "Map",
      mapDesc: "Displays the spatial voxel in 2D.",
      linksTitle: "Related links",
      guidelineLink: "Spatial ID Guideline for Utilization of 4D Spatio-Temporal Information",
      repoLink: "Open Data Spaces Spatial ID Related Repositories",
      footerNote: "This page is provided as a trial environment. Please verify the results at your own responsibility."
    }
  };

  function start() {
    const msgEl = document.getElementById("msg");

    if (!window.SpatialId || !window.SpatialId.Space) {
      if (msgEl) {
        msgEl.textContent = messages.ja.libraryMissing;
      }
      return;
    }

    if (!window.L) {
      if (msgEl) {
        msgEl.textContent = messages.ja.mapMissing;
      }
      return;
    }

    const Space = window.SpatialId.Space;

    function $(id) {
      const el = document.getElementById(id);
      if (!el) throw new Error("Element #" + id + " not found");
      return el;
    }

    const form = $("calc-form");
    const latEl = $("lat");
    const lngEl = $("lng");
    const hEl = $("h");
    const zEl = $("z");
    const zfxyEl = $("zfxy");
    const langSelect = $("lang-select");

    let currentLang = document.documentElement.lang === "en" ? "en" : "ja";
    let currentLayer = null;
    let currentMarker = null;

    const map = L.map("map").setView([DEFAULT_LAT, DEFAULT_LNG], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    function setMessage(key) {
      msgEl.textContent = messages[currentLang][key] || "";
    }

    function clearMessage() {
      msgEl.textContent = "";
    }

    function applyTranslations(lang) {
      currentLang = lang;
      document.documentElement.lang = lang;

      const dict = translations[lang];
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
          el.textContent = dict[key];
        }
      });
    }

    function clearDrawings() {
      if (currentLayer) {
        map.removeLayer(currentLayer);
        currentLayer = null;
      }
      if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
      }
    }

    function draw(space) {
      const geo = space.toGeoJSON();
      const c = space.center;

      clearDrawings();

      currentLayer = L.geoJSON(geo, {
        style: function () {
          return {
            color: "#2457d6",
            weight: 2,
            fillColor: "#2457d6",
            fillOpacity: 0.2
          };
        }
      }).addTo(map);

      currentMarker = L.marker([c.lat, c.lng]).addTo(map);

      map.fitBounds(currentLayer.getBounds(), {
        padding: [20, 20]
      });
    }

    function parseAltitude(value) {
      if (value === "" || value == null) {
        return 0;
      }
      return parseFloat(value);
    }

    function validate(lat, lng, alt, z) {
      if ([lat, lng, alt, z].some((v) => Number.isNaN(v))) {
        return "invalidInput";
      }
      if (lat < MIN_LAT || lat > MAX_LAT) {
        return "invalidLat";
      }
      if (lng < MIN_LNG || lng > MAX_LNG) {
        return "invalidLng";
      }
      if (alt < MIN_ALT || alt > MAX_ALT) {
        return "invalidAlt";
      }
      if (!Number.isInteger(z) || z < MIN_Z || z > MAX_Z) {
        return "invalidZoom";
      }
      return null;
    }

    function calculateAndDraw() {
      const lat = parseFloat(latEl.value);
      const lng = parseFloat(lngEl.value);
      const alt = parseAltitude(hEl.value);
      const z = parseInt(zEl.value, 10);

      const errorKey = validate(lat, lng, alt, z);
      if (errorKey) {
        setMessage(errorKey);
        zfxyEl.textContent = "-";
        clearDrawings();
        return;
      }

      try {
        const space = Space.getSpaceByLocation({ lat, lng, alt }, z);
        zfxyEl.textContent = space.zfxyStr.replace(/^\//, "");
        clearMessage();
        draw(space);
      } catch (err) {
        console.error(err);
        setMessage("calcError");
        zfxyEl.textContent = "-";
        clearDrawings();
      }
    }

    langSelect.addEventListener("change", function () {
      applyTranslations(langSelect.value);
      clearMessage();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      calculateAndDraw();
    });

    applyTranslations(currentLang);

    latEl.value = DEFAULT_LAT;
    lngEl.value = DEFAULT_LNG;
    zEl.value = DEFAULT_ZOOM;
    hEl.value = "";

    clearMessage();
  }

  document.addEventListener("DOMContentLoaded", start);
})();
