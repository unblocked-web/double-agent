export default function deepDiff(
  lhs: any,
  rhs: any,
  prevPath?: string,
  key?: PropertyKey,
  compare?: IObjectComparison,
): IObjectComparison {
  if (!compare) {
    compare = {
      added: [],
      changed: [],
      missing: [],
      same: [],
      order: [],
    };
  }
  let path = prevPath ?? '';
  if (key !== undefined && key !== null) {
    if (path) path += '.';
    path += String(key);
  }

  const isSame = Object.is(lhs, rhs);
  if (isSame) {
    compare.same.push(path);
    return compare;
  }

  const isLeftDefined = lhs !== undefined;
  const isRightDefined = rhs !== undefined;

  if (!isLeftDefined && isRightDefined) {
    compare.added.push({ path, rhs });
    return compare;
  }

  if (isLeftDefined && !isRightDefined) {
    compare.missing.push({ path, lhs, rhs });
    return compare;
  }

  const leftType = typeof lhs;
  const rightType = typeof rhs;
  if (leftType !== rightType || (leftType !== 'object' && isSame === false)) {
    compare.changed.push({ path, lhs, rhs });
    return compare;
  }

  if (leftType === 'object' && lhs && rhs) {
    const lKeys = Object.keys(lhs);
    const rKeys = Object.keys(rhs);

    const sameKeysLhs = lKeys.filter(x => x[0] !== '_' && rKeys.includes(x));
    const sameKeysRhs = rKeys.filter(x => x[0] !== '_' && lKeys.includes(x));

    for (let i = 0; i < sameKeysLhs.length; i += 1) {}
    if (sameKeysLhs.toString() !== sameKeysRhs.toString()) {
      compare.order.push({ path, lhs: lKeys, rhs: rKeys });
    }

    for (const key of lKeys) {
      if (key in rhs) {
        deepDiff(lhs[key], rhs[key], path, key, compare);
      } else {
        compare.missing.push({ path: `${path}.${key}`, lhs: lhs[key] });
      }
    }
    for (const key of rKeys) {
      if (key in lhs) continue;
      compare.added.push({ path: `${path}.${key}`, rhs: rhs[key] });
    }
  } else {
    console.log('missing something?', leftType, lhs);
  }

  return compare;
}

export interface IObjectComparison {
  same: string[];
  missing: IDiff[];
  added: IDiff[];
  changed: IDiff[];
  order: IDiff[];
}

export interface IDiff {
  path: string;
  lhs?: any;
  rhs?: any;
}
