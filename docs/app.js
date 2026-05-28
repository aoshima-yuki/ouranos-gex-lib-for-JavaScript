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

    const Space = window.SpatialId.Space;

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

    let viewer = null;
    let voxelEntity = null;
    let centerEntity = null;
    let mapEnabled = false;
    let isCameraInitialized = false;

    latEl.value = formatCoord(DEFAULT_LAT);
    lngEl.value = formatCoord(DEFAULT_LNG);
    hEl.value = String(DEFAULT_ALT);
    zEl.value = String(DEFAULT_ZOOM);

    function applyTranslations(lang) {
      currentLang = lang;
      const dict = translations[lang];
      document.documentElement.lang = lang;

      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.textContent = dict[key];
      });
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

    function getTile(space) {
      if (space.zfxy) return space.zfxy;
      if (space.zfxyTile) return space.zfxyTile;
      return null;
    }

    function getTileHeight(space, fallbackZ) {
      const tile = getTile(space);
      const z = tile && Number.isInteger(tile.z) ? tile.z : fallbackZ;
      return Math.pow(2, 25 - z);
    }

    function getFloorAltitude(space, fallbackAlt, fallbackZ) {
      if (typeof space.alt === "number") return space.alt;
      if (typeof space.floor === "number") return space.floor;

      const tile = getTile(space);

      if (tile && Number.isFinite(tile.f) && Number.isFinite(tile.z)) {
        return tile.f * Math.pow(2, 25 - tile.z);
      }

      const height = Math.pow(2, 25 - fallbackZ);
      return Math.floor(fallbackAlt / height) * height;
    }

    function getZfxyString(space) {
      if (typeof space.zfxyStr === "string") {
        return space.zfxyStr.replace(/^\//, "");
      }

      const tile = getTile(space);

      if (tile) {
        return `${tile.z}/${tile.f}/${tile.x}/${tile.y}`;
      }

      return "-";
    }

    function getCenter(space, input) {
      if (
        space.center &&
        Number.isFinite(space.center.lat) &&
        Number.isFinite(space.center.lng)
      ) {
        return space.center;
      }

      return {
        lat: input.lat,
        lng: input.lng
      };
    }

    function updateOutput(space, input) {
      const center = getCenter(space, input);
      const floor = getFloorAltitude(space, input.alt, input.z);
      const height = getTileHeight(space, input.z);
      const ceiling = floor + height;

      zfxyEl.textContent = getZfxyString(space);
      centerEl.textContent = `${formatCoord(center.lat)}, ${formatCoord(center.lng)}`;
      floorEl.textContent = formatMeter(floor);
      ceilingEl.textContent = formatMeter(ceiling);

      return {
        center,
        floor,
        height,
        ceiling
      };
    }

    function resetOutput() {
      zfxyEl.textContent = "-";
      centerEl.textContent = "-";
      floorEl.textContent = "-";
      ceilingEl.textContent = "-";
      clearVoxel();
    }

    function calculate() {
      const state = validateInputs();
      setValidity(state);

      if (!state.ok) {
        msgEl.textContent = state.message;
        resetOutput();
        return;
      }

      try {
        const space = Space.getSpaceByLocation(
          {
            lat: state.lat,
            lng: state.lng,
            alt: state.alt
          },
          state.z
        );

        const verticalInfo = updateOutput(space, state);
        msgEl.textContent = "";

        try {
          drawVoxel(space, state, verticalInfo);
        } catch (mapDrawError) {
          console.warn("3D voxel draw error:", mapDrawError);
        }
      } catch (error) {
        msgEl.textContent = `${messages[currentLang].calcError} ${
          error.message || ""
        }`.trim();
        resetOutput();
      }
    }

    function scheduleCalculate() {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        calculate();
      }, DEBOUNCE_MS);
    }

    function clearVoxel() {
      if (!viewer) return;

      if (voxelEntity) viewer.entities.remove(voxelEntity);
      if (centerEntity) viewer.entities.remove(centerEntity);

      voxelEntity = null;
      centerEntity = null;
    }

    function extractOuterRing(space) {
      if (typeof space.toGeoJSON !== "function") return null;

      const geojson = space.toGeoJSON();
      const geom = geojson.type === "Feature" ? geojson.geometry : geojson;

      if (!geom || !geom.coordinates) return null;

      if (geom.type === "Polygon") return geom.coordinates[0];

      if (
        geom.type === "MultiPolygon" &&
        geom.coordinates &&
        geom.coordinates[0] &&
        geom.coordinates[0][0]
      ) {
        return geom.coordinates[0][0];
      }

      return null;
    }

    function drawVoxel(space, input, verticalInfo) {
      if (!mapEnabled || !viewer || !window.Cesium) return;

      const Cesium = window.Cesium;
      const ring = extractOuterRing(space);

      if (!ring || ring.length < 4) return;

      clearVoxel();

      const positions = [];

      ring.forEach((coord, index) => {
        const isClosingPoint =
          index === ring.length - 1 &&
          coord[0] === ring[0][0] &&
          coord[1] === ring[0][1];

        if (!isClosingPoint) {
          positions.push(
            Cesium.Cartesian3.fromDegrees(
              coord[0],
              coord[1],
              verticalInfo.floor
            )
          );
        }
      });

      if (positions.length < 3) return;

      voxelEntity = viewer.entities.add({
        name: "Spatial ID voxel",
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          height: verticalInfo.floor,
          extrudedHeight: verticalInfo.ceiling,
          material: Cesium.Color.ROYALBLUE.withAlpha(0.28),
          outline: true,
          outlineColor: Cesium.Color.ROYALBLUE
        }
      });

      centerEntity = viewer.entities.add({
        name: "Input point",
        position: Cesium.Cartesian3.fromDegrees(
          verticalInfo.center.lng,
          verticalInfo.center.lat,
          verticalInfo.ceiling
        ),
        point: {
          pixelSize: 8,
          color: Cesium.Color.DEEPSKYBLUE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });

      if (!isCameraInitialized) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            verticalInfo.center.lng,
            verticalInfo.center.lat,
            verticalInfo.ceiling + Math.max(250, verticalInfo.height * 18)
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-55),
            roll: 0
          },
          duration: 0.8
        });

        isCameraInitialized = true;
      }
    }

    function init3DMap() {
      if (!window.Cesium || !$("map3d")) {
        if (msgEl) msgEl.textContent = messages[currentLang].mapMissing;
        return;
      }

      const Cesium = window.Cesium;

      try {
        viewer = new Cesium.Viewer("map3d", {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          imageryProvider: new Cesium.UrlTemplateImageryProvider({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            maximumLevel: 19,
            credit: "© OpenStreetMap contributors"
          })
        });

        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            DEFAULT_LNG,
            DEFAULT_LAT,
            1200
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-55),
            roll: 0
          }
        });

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction(click => {
          applyMapClick(click.position);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        mapEnabled = true;
      } catch (error) {
        mapEnabled = false;
        viewer = null;

        if (msgEl) {
          msgEl.textContent = `${messages[currentLang].mapMissing} ${
            error.message || ""
          }`.trim();
        }
      }
    }

    function applyMapClick(position) {
      if (!mapEnabled || !viewer || !window.Cesium) return;

      const Cesium = window.Cesium;
      const cartesian = viewer.camera.pickEllipsoid(
        position,
        viewer.scene.globe.ellipsoid
      );

      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lng = Cesium.Math.toDegrees(cartographic.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      latEl.value = formatCoord(lat);
      lngEl.value = formatCoord(lng);

      calculate();
    }

    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        calculate();
      });
    }

    [latEl, lngEl, hEl, zEl].forEach(el => {
      el.addEventListener("input", scheduleCalculate);
      el.addEventListener("change", calculate);
    });

    [latEl, lngEl].forEach(el => {
      el.addEventListener("blur", () => {
        const value = Number(el.value);

        if (Number.isFinite(value)) {
          el.value = formatCoord(value);
          calculate();
        }
      });
    });

    if (langSelect) {
      langSelect.addEventListener("change", e => {
        applyTranslations(e.target.value);
        calculate();
      });
    }

    applyTranslations("ja");
    init3DMap();

    // 初期表示時にも出力を表示する
    calculate();
  }

  document.addEventListener("DOMContentLoaded", start);
})();
