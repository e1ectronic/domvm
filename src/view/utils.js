import { startsWith } from '../utils';

const t = true;

const unitlessProps = {
	animationIterationCount: t,
	boxFlex: t,
	boxFlexGroup: t,
	columnCount: t,
	counterIncrement: t,
	fillOpacity: t,
	flex: t,
	flexGrow: t,
	flexOrder: t,
	flexPositive: t,
	flexShrink: t,
	float: t,
	fontWeight: t,
	gridColumn: t,
	lineHeight: t,
	lineClamp: t,
	opacity: t,
	order: t,
	orphans: t,
	stopOpacity: t,
	strokeDashoffset: t,
	strokeOpacity: t,
	strokeWidth: t,
	tabSize: t,
	transform: t,
	transformOrigin: t,
	widows: t,
	zIndex: t,
	zoom: t,
};

export function autoPx(name, val) {
	return !isNaN(val) && !unitlessProps[name] ? (val + "px") : val;
}

export function camelDash(val) {
	return val.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function styleStr(css) {
	var style = "";

	for (var pname in css) {
		if (css[pname] !== null)
			style += camelDash(pname) + ": " + autoPx(pname, css[pname]) + '; ';
	}

	return style;
}

export function isEvProp(name) {
	return startsWith(name, "on");
}

export function isSplProp(name) {
	return name[0] == "_";
}

export function isStyleProp(name) {
	return name == "style";
}

export function repaint(node) {
	node && node.el && node.el.offsetHeight;
}