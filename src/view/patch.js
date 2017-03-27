import { ELEMENT, TEXT, COMMENT, VVIEW, VMODEL } from './VTYPES';
import { isArr, binaryKeySearch } from '../utils';
import { hydrateBody } from './hydrate';
import { removeChild } from './dom';
import { syncChildren } from './syncChildren';
import { fireHooks } from './hooks';
import { patchAttrs } from './patchAttrs';
import { createView } from './createView';
import { FIXED_BODY, KEYED_LIST } from './initElementNode';

function findDonor(n, obody, fromIdx, toIdx) {		// pre-tested isView?
	for (; fromIdx < obody.length; fromIdx++) {
		var o = obody[fromIdx];

		if (n.type == VVIEW && o.vm != null) {			// also ignore recycled/moved?
			var ov = o.vm;

			// match by key & viewFn
			if (ov.view == n.view && ov.key == n.key)
				return o;
		}

		if (o.el._node != o || n.tag !== o.tag || n.type !== o.type || n.vm !== o.vm)
			continue;

		// if n.view

		if (n.key === o.key)		// accounts for matching & both null
			return o;
		else {
			//
			if (o.key == null) {
				return o;
			}
			// n.key && o.key, ident?
			else {
			//	console.log(n.key, o.key);
			}
		}
	}

	return null;
}

// list must be a sorted list of vnodes by key
function findListDonor(n, list) {
	var idx = binaryKeySearch(list, n.key);
	return idx > -1 ? list[idx] : null;
}

// have it handle initial hydrate? !donor?
// types (and tags if ELEM) are assumed the same, and donor exists
export function patch(vnode, donor, isRedrawRoot) {
	donor.hooks && fireHooks("willRecycle", donor, vnode);

	var el = vnode.el = donor.el;

	var obody = donor.body;
	var nbody = vnode.body;

	el._node = vnode;

	// "" => ""
	if (vnode.type == TEXT && nbody !== obody) {
		el.nodeValue = nbody;
		return;
	}

	if (vnode.attrs != null || donor.attrs != null)
		patchAttrs(vnode, donor);

	// patch events

	var oldIsArr = isArr(obody);
	var newIsArr = isArr(nbody);

//	var nonEqNewBody = nbody != null && nbody !== obody;

	if (oldIsArr) {
		// [] => []
		if (newIsArr) {
		//	console.log('[] => []', obody, nbody);
			// graft children
			patchChildren(vnode, donor, isRedrawRoot);
		}
		// [] => "" | null
		else if (nbody !== obody) {
			// needs cleanup pass?
		//	console.log('[] => ""', obody, nbody);

			if (nbody != null) {
				if (vnode.raw)
					el.innerHTML = nbody;
				else
					el.textContent = nbody;
			}
			else {
				while (el.firstChild)
					removeChild(el, el.firstChild);
			}
		}
	}
	else {
		// "" | null => []
		if (newIsArr) {
		//	console.log('"" => []', obody, nbody);	// hydrate new here?
			el.firstChild && el.removeChild(el.firstChild);
			hydrateBody(vnode);
		}
		// "" | null => "" | null
		else if (nbody !== obody) {
		//	console.log('"" => ""', donor, vnode);

			if (vnode.raw)
				el.innerHTML = nbody;
			else if (el.firstChild)
				el.firstChild.nodeValue = nbody;
			else
				el.textContent = nbody;
		}
	}

	donor.hooks && fireHooks("didRecycle", donor, vnode);
}

function sortByKey(a, b) {
	return a.key > b.key ? 1 : a.key < b.key ? -1 : 0;
}

// [] => []
function patchChildren(vnode, donor, isRedrawRoot) {
	if (vnode.flags & KEYED_LIST) {
		var list = donor.body.slice();
		list.sort(sortByKey);
		var find = findListDonor;
	}
	else {
		var list = donor.body;
		var find = findDonor;
	}

	var donor2,
		fromIdx = 0,				// first unrecycled node (search head)
		nbody = vnode.body;

	for (var i = 0; i < nbody.length; i++) {
		var node2 = nbody[i];
		var type2 = node2.type;

		// ELEMENT,TEXT,COMMENT
		if (type2 <= COMMENT) {
			if (donor2 = find(node2, list, fromIdx))
				patch(node2, donor2);
		}
		else if (type2 == VVIEW) {
			if (donor2 = find(node2, list, fromIdx))		// update/moveTo
				var vm = donor2.vm._update(node2.model, vnode, i);		// withDOM
			else
				var vm = createView(node2.view, node2.model, node2.key, node2.opts)._redraw(vnode, i, false);	// createView, no dom (will be handled by sync below)

			type2 = vm.node.type;
		}
		else if (type2 == VMODEL) {
			var vm = node2.vm._update(node2.model, vnode, i);
			type2 = vm.node.type;
		}

		// to keep search space small, if donation is non-contig, move node fwd?
		// re-establish contigindex
		if (!vnode.list && donor2 != null && donor2.idx == fromIdx)
			fromIdx++;
	}

	if (vnode.type == ELEMENT && !(vnode.flags & FIXED_BODY))
		syncChildren(vnode, donor);
}