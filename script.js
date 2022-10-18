Vue.createApp({
	data() {
		return {
			isMobile: "ontouchstart" in document.documentElement,
			contrast: false,
			paths: [],
			currentPath: 0,
			cssInput: "",
			draggedPoint: null,
			gridSnap: false,
			lastSelected: null,
			resetConfirm: false,
			deleteConfirm: false,
			debouncer: {},
			cursorPos: { x: 0, y: 0 },
			currentPathTxt: "",
			incorrectInput: false,
			defaultShapes: [
				{
					name: "Triangle",
					points: [
						{ x: 50, y: 0 },
						{ x: 100, y: 100 },
						{ x: 0, y: 100 }
					]
				},
				{
					name: "Rhombus",
					points: [
						{ x: 50, y: 0 },
						{ x: 100, y: 50 },
						{ x: 50, y: 100 },
						{ x: 0, y: 50 }
					]
				},
				{
					name: "Hexagon",
					points: [
						{ x: 25, y: 0 },
						{ x: 75, y: 0 },
						{ x: 100, y: 50 },
						{ x: 75, y: 100 },
						{ x: 25, y: 100 },
						{ x: 0, y: 50 }
					]
				},
				{
					name: "Octagon",
					points: [
						{ x: 30, y: 0 },
						{ x: 70, y: 0 },
						{ x: 100, y: 30 },
						{ x: 100, y: 70 },
						{ x: 70, y: 100 },
						{ x: 30, y: 100 },
						{ x: 0, y: 70 },
						{ x: 0, y: 30 }
					]
				},
				{
					name: "Inverted",
					points: [
						{ x: 100, y: 0 },
						{ x: 100, y: 100 },
						{ x: 50, y: 100 },
						{ x: 50, y: 60 },
						{ x: 60, y: 60 },
						{ x: 60, y: 40 },
						{ x: 40, y: 40 },
						{ x: 40, y: 60 },
						{ x: 50, y: 60 },
						{ x: 50, y: 100 },
						{ x: 0, y: 100 },
						{ x: 0, y: 0 }
					]
				}
			]
		};
	},
	mounted() {
		document.body.style.setProperty("--colorRot", ~~(Math.random() * 240) + 120);
		if (
			typeof localStorage.getItem("pathsList") === "string" &&
			localStorage.getItem("pathsList") &&
			localStorage.getItem("pathsList").length
		) {
			try {
				Object.assign(this.paths, JSON.parse(localStorage.getItem("pathsList")));
				this.currentPath = parseInt(localStorage.getItem("currentPath"));
				if (Number.isNaN(this.currentPath)) {
					this.currentPath = 0;
				}
			} catch {
				this.initPath();
			}
		} else {
			this.initPath();
		}
		this.contrast = localStorage.getItem("contrast") === "true";
	},
	computed: {
		currentClipPath: function () {
			return this.paths.length && typeof this.currentPointsPath !== "undefined"
				? this.pathFromPoints(this.currentPointsPath)
				: "";
		},
		currentPointsPath: function () {
			if (typeof this.paths[this.currentPath] !== "undefined") {
				this.currentPathTxt = this.pathFromPoints(this.paths[this.currentPath]);
			}
			return this.paths[this.currentPath];
		}
	},
	watch: {
		paths: {
			handler: function (newVal, oldVal) {
				this.saveToStore();
			},
			deep: true
		},
		contrast: function (newVal, oldVal) {
			localStorage.setItem("contrast", newVal);
		},
		currentPath: function (newVal, oldVal) {
			let shownSlot = this.$refs.savedPathsList.querySelector(
				`:nth-child(${newVal})`
			);
			if (typeof shownSlot !== "undefined" && shownSlot !== null) {
				shownSlot.scrollIntoView({
					behavior: "smooth",
					block: "start",
					inline: "nearest"
				});
			}
			this.saveToStore();
		}
	},
	methods: {
		initPath: function () {
			if (
				this.paths.length &&
				typeof this.paths !== "undefined" &&
				typeof this.currentPointsPath !== "undefined"
			) {
				this.paths.splice(this.currentPath, 1, [
					{ x: 50, y: 0 },
					{ x: 100, y: 100 },
					{ x: 0, y: 100 }
				]);
				this.draggedPoint = null;
				this.lastSelected = null;
			} else {
				this.paths = [];
				Object.assign(this.paths, [
					[
						{ x: 50, y: 0 },
						{ x: 100, y: 50 },
						{ x: 0, y: 50 }
					]
				]);
			}
		},
		addPath: function () {
			this.currentPath = this.paths.length;
			this.paths.push([
				{ x: 50, y: 0 },
				{ x: 100, y: 100 },
				{ x: 0, y: 100 }
			]);
		},
		loadDefaultPath: function (pathIndex) {
			if (typeof this.defaultShapes[pathIndex] !== "undefined") {
				let presetPathJson = JSON.stringify(this.defaultShapes[pathIndex].points),
					matchingPath = this.paths
						.map((e) => JSON.stringify(e))
						.findIndex((e) => e === presetPathJson);
				if (matchingPath === -1) {
					this.currentPath = this.paths.length;
					this.paths.push(
						this.defaultShapes[pathIndex].points.map((p) => {
							return { x: p.x, y: p.y };
						})
					);
				} else {
					this.currentPath = matchingPath;
				}
			}
		},
		deleteSave: function () {
			if (this.paths.length > 1) {
				let prevPath = this.currentPath;
				this.currentPath =
					this.paths.length - 1 < this.currentPath || this.currentPath === 0
						? this.currentPath
						: this.currentPath - 1;
				this.paths.splice(prevPath, 1);
			}
		},
		saveToStore: function () {
			let debouncer = Date.now();
			this.debouncer.saving = debouncer;
			setTimeout(() => {
				if (this.debouncer.saving === debouncer) {
					localStorage.setItem("currentPath", this.currentPath);
					localStorage.setItem("pathsList", JSON.stringify(this.paths));
				}
			}, 50);
		},
		setPos: function (e) {
			if (this.draggedPoint !== null) {
				let bounds = this.$refs.pathDraw.getBoundingClientRect(),
					cursorX = e.type == "touchmove" ? e.touches[0].pageX : e.clientX,
					cursorY = e.type == "touchmove" ? e.touches[0].pageY - 50 : e.clientY,
					posX = parseFloat(((cursorX - bounds.x) / bounds.width) * 100).toFixed(2);
				posY = parseFloat(((cursorY - bounds.y) / bounds.height) * 100).toFixed(2);
				if (this.gridSnap) {
					posX = ~~posX;
					posY = ~~posY;
				}
				this.paths[this.currentPath].splice(this.draggedPoint, 1, {
					x: posX,
					y: posY
				});
			}
		},
		selectPoint: function (point) {
			this.draggedPoint = point;
			this.lastSelected = point;
		},
		unselectPoint: function () {
			this.draggedPoint = null;
		},
		addPoint: function () {
			if (this.currentPointsPath.length >= 2) {
				let lastPos = this.currentPointsPath.length - 1,
					selected = this.lastSelected,
					averageX = 0,
					averageY = 0;
				if (selected === lastPos || selected === null) {
					averageX =
						(parseFloat(this.currentPointsPath[lastPos].x) +
							parseFloat(this.currentPointsPath[0].x)) /
						2;
					averageY =
						(parseFloat(this.currentPointsPath[lastPos].y) +
							parseFloat(this.currentPointsPath[0].y)) /
						2;
					this.paths[this.currentPath].push({ x: averageX, y: averageY });
					this.lastSelected = this.currentPointsPath.length - 1;
				} else {
					averageX =
						(parseFloat(this.currentPointsPath[selected].x) +
							parseFloat(this.currentPointsPath[selected + 1].x)) /
						2;
					averageY =
						(parseFloat(this.currentPointsPath[selected].y) +
							parseFloat(this.currentPointsPath[selected + 1].y)) /
						2;
					this.paths[this.currentPath].splice(selected + 1, 0, {
						x: averageX,
						y: averageY
					});
					this.lastSelected = selected + 1;
				}
			} else {
				this.paths[this.currentPath].push({ x: 50, y: 50 });
				this.lastSelected = this.currentPointsPath.length - 1;
			}
		},
		delPoint: function () {
			if (this.lastSelected != null) {
				this.currentPointsPath.splice(this.lastSelected, 1);
				this.lastSelected = null;
			}
		},
		copyPathText: function () {
			navigator.clipboard.writeText(this.currentClipPath);
		},
		interpretTextPath: function (currentPathTxt) {
			let debouncer = Date.now();
			this.debouncer.input = debouncer;
			setTimeout(() => {
				if (this.debouncer.input === debouncer) {
					try {
						let interpretedInput = currentPathTxt
							.replace(/\s*clip-path\:\s*/, "")
							.replace(/polygon\s*\(([^\)]*)\).*/, "$1")
							.split(",")
							.map((e) =>
								e
									.trim()
									.split(/\s+|%/)
									.filter((e) => e.length)
							)
							.filter((e) => e.length === 2)
							.map((e) => {
								return { x: e[0], y: e[1] };
							})
							.filter((e) => e.x.match(/\d+(\.\d+)?/) && e.x.match(/\d+(\.\d+)?/));
						if (interpretedInput.length) {
							this.paths[this.currentPath] = [];
							Object.assign(this.paths[this.currentPath], interpretedInput);
						}
					} catch {}
				}
			}, 400);
		},
		pathFromPoints: function (points) {
			let currentPathPoints = points.map((e) => {
				return {
					x: parseFloat(e.x).toFixed(2).replace(".00", ""),
					y: parseFloat(e.y).toFixed(2).replace(".00", "")
				};
			});
			let path = currentPathPoints.map((e) => `${e.x}% ${e.y}%`).join(",");
			return `clip-path: polygon(${path});`;
		},
		toggleGrid: function (toggled = null) {
			this.gridSnap = toggled !== null ? toggled : !this.gridSnap;
		},
		interpretKey: function (pressedDown, event) {
			if (event.key === "Shift") {
				this.toggleGrid(pressedDown);
			}
		},
		test: function (e) {
			console.log(e);
		}
	}
}).mount("#app");