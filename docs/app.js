(() => {
  const DEFAULT_LAT = 35.7300467;
  const DEFAULT_LNG = 139.7474538;
  const DEFAULT_ALT = 0;
  const DEFAULT_ZOOM = 20;

  const MIN_ALT = -33554432;
  const MAX_ALT = 33554432;
  const MIN_LAT = -85.05112878;
  const MAX_LAT = 85.05112878;
  const MIN_LNG = -180;
  const MAX_LNG = 180;
  const MIN_Z = 0;
  const MAX_Z = 25;
  const DECIMAL_DIGITS = 7;
  const DEBOUNCE_MS = 250;

  const messages = {
    ja: {
      libraryMissing: "ライブラリが読み込めていません。",
      mapMissing: "3D地図ライブラリが読み込めていません。",
      invalidLat: `緯度は ${MIN_LAT} ～ ${MAX_LAT} の範囲で入力してください。`,
      invalidLng: `経度は ${MIN_LNG} ～ ${MAX_LNG} の範囲で入力してください。`,
      invalidAlt: `標高は ${MIN_ALT} ～ ${MAX_ALT} m の範囲で入力してください。`,
      invalidZoom: `ズームレベルは ${MIN_Z} ～ ${MAX_Z} の整数で入力してください。`,
      calcError: "計算中にエラーが発生しました。"
    },
    en: {
      libraryMissing: "Spatial ID library is not loaded.",
      mapMissing: "3D map library is not loaded.",
      invalidLat: `Latitude must be between ${MIN_LAT} and ${MAX_LAT}.`,
      invalidLng: `Longitude must be between ${MIN_LNG} and ${MAX_LNG}.`,
      invalidAlt: `Altitude must be between ${MIN_ALT} and ${MAX_ALT} meters.`,
      invalidZoom: `Zoom level must be an integer between ${MIN_Z} and ${MAX_Z}.`,
      calcError: "An error occurred during calculation."
    }
  };

  const translations = {
    ja: {
      pageTitle: "空間ID試行環境",
      pageDesc:
        "緯度・経度・標高・ズームレベルから空間ID（z/f/x/y）を算出できます。地図をクリックして座標を入力することもできます。",
      inputTitle: "入力",
      latLabel: "緯度（10進度）",
      lngLabel: "経度（10進度）",
      altLabel: "標高（m）",
      zoomLabel: "ズームレベル",
      resultTitle: "出力",
      resultLabel: "空間ID",
      centerLabel: "中心座標",
      floorLabel: "下端標高",
      ceilingLabel: "上端標高",
      mapTitle: "3D地図",
      mapHelp: "地図をクリックすると緯度・経度欄に反映されます。",
      linksTitle: "関連情報",
      guidelineLink: "4次元時空間情報利活用のための空間IDガイドライン",
      repoLink: "Open Data Spaces 4次元時空間ID 関連リポジトリ",
      footerNote:
        "本画面は試行環境です。表示結果は利用者の責任においてご確認ください。"
    },
    en: {
      pageTitle: "Spatial ID Demo",
      pageDesc:
        "Calculate a Spatial ID (z/f/x/y) from latitude, longitude, altitude, and zoom level. You can also click the map to fill in the coordinates.",
      inputTitle: "Input",
      latLabel: "Latitude (decimal degrees)",
      lngLabel: "Longitude (decimal degrees)",
      altLabel: "Altitude (m)",
      zoomLabel: "Zoom level",
      resultTitle: "Output",
      resultLabel: "Spatial ID",
      centerLabel: "Center",
      floorLabel: "Floor altitude",
      ceilingLabel: "Ceiling altitude",
      mapTitle: "3D Map",
      mapHelp: "Click the map to update latitude and longitude.",
      linksTitle: "Related links",
      guidelineLink:
        "Spatial ID Guideline for Utilization of 4D Spatio-Temporal Information",
      repoLink: "Open Data Spaces Spatial ID Related Repositories",
      footerNote:
        "This page is provided as a trial environment. Please verify the results at your own responsibility."
    }
  };

  function start() {
    const msgEl = document.getElementById("msg");

    if (!window.SpatialId || !window.SpatialId.Space) {
      if (msgEl) msgEl.textContent = messages.ja.libraryMissing;
      return;
    }

    if (!window.Cesium) {
      if (msgEl) msgEl.textContent = messages.ja.mapMissing;
      return;
    }

    const Space = window.SpatialId.Space;
    const Cesium = window.Cesium;

    function $(id) {
      return document.getElementById(id);
    }

    const form = $("calc-form");
    const latEl = $("lat");
    const lngEl = $("lng");
    const hEl = $("h");
    const zEl = $("z");
    const zfxyEl = $("zfxy");
    const centerEl = $("center");
    const floorEl = $("floor");
    const ceilingEl = $("ceiling");
    const langSelect = $("lang-select");

    let currentLang = "ja";
    let debounceTimer = null;
    let voxelEntity = null;
    let centerEntity = null;

    latEl.value = formatCoord(DEFAULT_LAT);
    lngEl.value = formatCoord(DEFAULT_LNG);
    hEl.value = String(DEFAULT_ALT);
    zEl.value = String(DEFAULT_ZOOM);

    Cesium.Ion.defaultAccessToken = "";

    const viewer = new Cesium.Viewer("map", {
      animation: false,
      timeline: false,
      baseLayerPicker: true,
      geocoder: false,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider()
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(DEFAULT_LNG, DEFAULT_LAT, 1200),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-55),
        roll: 0
      }
    });

    function applyTranslations(lang) {
      currentLang = lang;
      const dict = translations[lang];
      document.documentElement.lang = lang;

      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.textContent = dict[key];
      });

      validateAndCalculate(false);
    }

    function formatCoord(value) {
      return Number(value).toFixed(DECIMAL_DIGITS);
    }

    function formatMeter(value) {
      return `${Number(value).toFixed(2)} m`;
    }

    function toNumber(el) {
      if (el.value === "") return NaN;
      return Number(el.value);
    }

    function isInRange(value, min, max) {
      return Number.isFinite(value) && value >= min && value <= max;
    }

    function validateInputs() {
      const lat = toNumber(latEl);
      const lng = toNumber(lngEl);
      const alt = hEl.value === "" ? 0 : toNumber(hEl);
      const z = toNumber(zEl);

      if (!isInRange(lat, MIN_LAT, MAX_LAT)) {
        return { ok: false, message: messages[currentLang].invalidLat };
      }

      if (!isInRange(lng, MIN_LNG, MAX_LNG)) {
        return { ok: false, message: messages[currentLang].invalidLng };
      }

      if (!isInRange(alt, MIN_ALT, MAX_ALT)) {
        return { ok: false, message: messages[currentLang].invalidAlt };
      }

      if (!Number.isInteger(z) || !isInRange(z, MIN_Z, MAX_Z)) {
        return { ok: false, message: messages[currentLang].invalidZoom };
      }

      return { ok: true, lat, lng, alt, z };
    }

    function setValidity(state) {
      latEl.setCustomValidity("");
      lngEl.setCustomValidity("");
      hEl.setCustomValidity("");
      zEl.setCustomValidity("");

      if (state.ok) return;

      if (state.message === messages[currentLang].invalidLat) {
        latEl.setCustomValidity(state.message);
      }

      if (state.message === messages[currentLang].invalidLng) {
        lngEl.setCustomValidity(state.message);
      }

      if (state.message === messages[currentLang].invalidAlt) {
        hEl.setCustomValidity(state.message);
      }

      if (state.message === messages[currentLang].invalidZoom) {
        zEl.setCustomValidity(state.message);
      }
    }

    function clearEntities() {
      if (voxelEntity) viewer.entities.remove(voxelEntity);
      if (centerEntity) viewer.entities.remove(centerEntity);
      voxelEntity = null;
      centerEntity = null;
    }

    function getTileHeight(space, z) {
      if (space.zfxy && Number.isInteger(space.zfxy.z)) {
        return Math.pow(2, 25 - space.zfxy.z);
      }
      return Math.pow(2, 25 - z);
    }

    function getFloorAltitude(space, fallbackAlt, z) {
      if (typeof space.alt === "number") return space.alt;
      if (typeof space.floor === "number") return space.floor;

      if (space.zfxy && Number.isFinite(space.zfxy.f)) {
        return space.zfxy.f * Math.pow(2, 25 - space.zfxy.z);
      }

      return fallbackAlt;
    }

    function extractPolygonPositions(space) {
      const geo = space.toGeoJSON();

      if (!geo || !geo.geometry) return null;

      if (geo.geometry.type === "Polygon") {
        return geo.geometry.coordinates[0];
      }

      if (
        geo.geometry.type === "MultiPolygon" &&
        geo.geometry.coordinates.length > 0
      ) {
        return geo.geometry.coordinates[0][0];
      }

      return null;
    }

    function draw3DVoxel(space, input) {
      clearEntities();

      const positions = extractPolygonPositions(space);
      if (!positions || positions.length < 4) return;

      const floor = getFloorAltitude(space, input.alt, input.z);
      const height = getTileHeight(space, input.z);
      const ceiling = floor + height;

      const hierarchyPositions = positions.map(coord =>
        Cesium.Cartesian3.fromDegrees(coord[0], coord[1], floor)
      );

      voxelEntity = viewer.entities.add({
        name: "Spatial ID voxel",
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(hierarchyPositions),
          height: floor,
          extrudedHeight: ceiling,
          material: Cesium.Color.ROYALBLUE.withAlpha(0.28),
          outline: true,
          outlineColor: Cesium.Color.BLUE
        }
      });

      centerEntity = viewer.entities.add({
        name: "Voxel center",
        position: Cesium.Cartesian3.fromDegrees(
          space.center.lng,
          space.center.lat,
          floor + height / 2
        ),
        point: {
          pixelSize: 8,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      });

      viewer.flyTo(voxelEntity, {
        duration: 0.7,
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(0),
          Cesium.Math.toRadians(-45),
          Math.max(80, height * 80)
        )
      });
    }

    function updateOutput(space, input) {
      const floor = getFloorAltitude(space, input.alt, input.z);
      const height = getTileHeight(space, input.z);
      const ceiling = floor + height;

      zfxyEl.textContent = space.zfxyStr.replace(/^\//, "");
      centerEl.textContent = `${formatCoord(space.center.lat)}, ${formatCoord(space.center.lng)}`;
      floorEl.textContent = formatMeter(floor);
      ceilingEl.textContent = formatMeter(ceiling);
    }

    function calculate() {
      const state = validateInputs();
      setValidity(state);

      if (!state.ok) {
        msgEl.textContent = state.message;
        zfxyEl.textContent = "-";
        centerEl.textContent = "-";
        floorEl.textContent = "-";
        ceilingEl.textContent = "-";
        clearEntities();
        return;
      }

      try {
        const space = Space.getSpaceByLocation(
          { lat: state.lat, lng: state.lng, alt: state.alt },
          state.z
        );

        updateOutput(space, state);
        draw3DVoxel(space, state);
        msgEl.textContent = "";
      } catch (error) {
        msgEl.textContent = `${messages[currentLang].calcError} ${
          error.message || ""
        }`.trim();
      }
    }

    function validateAndCalculate(debounce = true) {
      window.clearTimeout(debounceTimer);

      if (!debounce) {
        calculate();
        return;
      }

      debounceTimer = window.setTimeout(calculate, DEBOUNCE_MS);
    }

    function applyMapClick(position) {
      const cartesian = viewer.scene.pickPosition(position);

      let pickedCartesian = cartesian;

      if (!Cesium.defined(pickedCartesian)) {
        const ray = viewer.camera.getPickRay(position);
        pickedCartesian = viewer.scene.globe.pick(ray, viewer.scene);
      }

      if (!Cesium.defined(pickedCartesian)) return;

      const cartographic = Cesium.Cartographic.fromCartesian(pickedCartesian);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lng = Cesium.Math.toDegrees(cartographic.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      latEl.value = formatCoord(lat);
      lngEl.value = formatCoord(lng);
      validateAndCalculate(false);
    }

    form.addEventListener("submit", e => {
      e.preventDefault();
      validateAndCalculate(false);
    });

    [latEl, lngEl, hEl, zEl].forEach(el => {
      el.addEventListener("input", () => validateAndCalculate(true));
      el.addEventListener("change", () => validateAndCalculate(false));
    });

    [latEl, lngEl].forEach(el => {
      el.addEventListener("blur", () => {
        const value = Number(el.value);
        if (Number.isFinite(value)) el.value = formatCoord(value);
      });
    });

    langSelect.addEventListener("change", e => {
      applyTranslations(e.target.value);
    });

    const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction(click => {
      applyMapClick(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    applyTranslations("ja");
  }

  document.addEventListener("DOMContentLoaded", start);
})();
