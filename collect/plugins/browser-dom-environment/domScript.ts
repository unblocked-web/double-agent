/* eslint-disable */
import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import PageNames from './interfaces/PageNames';

const skipProps = [
  'Fingerprint2',
  'pageQueue',
  'afterQueueComplete',
  'extractPropsFromObject',
  'pageLoaded',
  'axios',
  'justAFunction',
];

const skipValues = ['innerHTML', 'outerHTML', 'innerText', 'outerText'];

const doNotInvoke = [
  'print',
  'alert',
  'prompt',
  'confirm',
  'open',
  'close',
  'reload',
  'assert',
  'requestPermission',
  'screenshot',
  'pageLoaded',
  'delete',
  'clear',
  'read',

  'start',
  'stop',

  'write',
  'writeln',
  'replaceWith',
  'remove',

  'self.history.back',
  'self.history.forward',
  'self.history.go',
  'self.history.pushState',
  'self.history.replaceState',

  'getUserMedia',
  'requestFullscreen',
  'webkitRequestFullScreen',
  'webkitRequestFullscreen',
  'getDisplayMedia',
];

const doNotAccess = [
  'self.CSSAnimation.prototype.timeline', // crashes Safari
  'self.Animation.prototype.timeline', // crashes Safari
  'self.CSSTransition.prototype.timeline', // crashes Safari
];

export default function domScript(ctx: IRequestContext, basePath: string = 'window') {
  const vars = JSON.stringify({
    skipProps,
    doNotAccess,
    doNotInvoke,
    skipValues,
  }).replace(/self\./g, `${basePath}.`);

  return `
(function browserDomProbe() {
  const { skipProps, doNotInvoke, doNotAccess, skipValues } = ${vars};
  const basePath = '${basePath}';
  const excludedInheritedKeys = ['name', 'length', 'constructor'];
  const loadedObjects = new Map([[self, basePath]]);
  const hierarchyNav = new Map();
  const detached = {};

  async function extractPropsFromObject(obj, parentPath) {
    let keys = [];
    let symbols = [];
    try {
      for (let key of Object.getOwnPropertyNames(obj)) {
        if (!keys.includes(key)) keys.push(key);
      }
    } catch (err) {}
    try {
      symbols = Object.getOwnPropertySymbols(obj);
      for (let key of symbols) {
        if (!keys.includes(key)) keys.push(key);
      }
    } catch (err) {}

    try {
      for (let key in obj) {
        if (!keys.includes(key)) keys.push(key);
      }
    } catch (err) {}

    const protos = await loadProtoHierarchy(obj, parentPath);

    const newObj = {
      _$protos: protos,
    };
    if (parentPath.includes('${basePath}.document.') && !parentPath.includes('${basePath}.document.documentElement') && newObj._$protos.includes('HTMLElement.prototype')) {
      newObj._$skipped = 'SKIPPED ELEMENT';
      return newObj;
    }

    if (parentPath.includes('new()') && parentPath.endsWith('.ownerElement')) {
      newObj._$skipped = 'SKIPPED ELEMENT';
      return newObj;
    }

    if (parentPath.split('.').length >= 8) {
      newObj._$skipped = 'SKIPPED MAX DEPTH';
      return newObj;
    }

    const isNewObject = parentPath.includes('.new()');
    if (isNewObject && newObj._$protos[0] === 'HTMLDocument.prototype') {
      newObj._$skipped = 'SKIPPED DOCUMENT';
      newObj._$type = 'HTMLDocument.prototype';
      return newObj;
    }
    if (Object.isFrozen(obj)) newObj._$isFrozen = true;
    if (Object.isSealed(obj)) newObj._$isSealed = true;
    if (!newObj._$protos.length) delete newObj._$protos;

    const inheritedProps = [];
    if (isNewObject) {
        let proto = obj;
        while (!!proto) {
          proto = Object.getPrototypeOf(proto);
          if (!proto || proto === Object || proto === Object.prototype || proto === Function
            || proto === Function.prototype || proto === HTMLElement.prototype || proto === EventTarget.prototype) break;
          for (const key of Object.getOwnPropertyNames(proto)) {
            if (!keys.includes(key) && !excludedInheritedKeys.includes(key)) inheritedProps.push(key);
          }
        }
    }
    // TODO: re-enable inherited properties once we are on stable ground with chrome flags
    // keys.push(...inheritedProps)

    for (const key of keys) {
      if (skipProps.includes(key)) {
        continue;
      }
      if (key === 'constructor') continue;

      const path = parentPath + '.' + String(key);
      if (path.endsWith('_GLOBAL_HOOK__')) continue;

      const prop = '' + String(key);

      if (path.includes('LinearAccelerationSensor.prototype')) {
          debugger;
      }
      if (path.startsWith('${basePath}.document') &&
          (typeof key === 'string' && (key.startsWith('child') || key.startsWith('first') || key.startsWith('last') || key.startsWith('next') || key.startsWith('prev')
              || key === 'textContent' || key === 'text'))
      ) {
        newObj[prop] =  { _$type: 'dom', _$skipped: 'SKIPPED DOM' };
        continue;
      }

      if (path.startsWith('${basePath}.document') && path.split('.').length > 5) {
        newObj[prop] =  { _$type: 'object', _$skipped: 'SKIPPED DEPTH' };
        continue;
      }

      if (key === 'style') {
        if (isNewObject) {
          newObj[prop] =  { _$type: 'object', _$skipped: 'SKIPPED STYLE' };
          continue;
        }
      }
      if (hierarchyNav.has(path)) {
        newObj[prop] = hierarchyNav.get(path);
        continue;
      }

      if (doNotAccess.includes(path)) {
        continue;
      }
      try {
        const isOwnProp = obj.hasOwnProperty && obj.hasOwnProperty(key) && !inheritedProps.includes(key);
        const value = await extractPropValue(obj, key, path, !isOwnProp);
        if (value && typeof value === 'string' && value.startsWith('REF:') && !isOwnProp) {
          // don't assign here
          //console.log('skipping ref', value);
        } else {
          newObj[prop] = value;
        }
      } catch (err) {
        newObj[prop] = err.toString();
      }
    }
    if (obj.prototype) {
      let instance;
      let constructorException;
      try {
        instance = await new obj();
      } catch (err) {
        constructorException = err.toString();
      }
      if (constructorException) {
        newObj['new()'] = { _$type: 'constructor', _$constructorException: constructorException };
      } else {
        try {
          newObj['new()'] = await extractPropsFromObject(instance, parentPath + '.new()');
          newObj['new()']._$type = 'constructor';
        } catch (err) {
          newObj['new()'] = err.toString();
        }
      }
    }
    return newObj;
  }

  async function loadProtoHierarchy(obj, parentPath) {
    const hierarchy = [];
    let proto = obj;
    if (typeof proto === 'function') return hierarchy;

    while (!!proto) {
      proto = Object.getPrototypeOf(proto);

      if (!proto) break;

      try {
        let name = getObjectName(proto);
        hierarchy.push(name);

        if (loadedObjects.has(proto)) continue;

        let path = '${basePath}.' + name;
        let topType = name.split('.').shift();
        if (!(topType in self)) {
          path = 'detached.' + name;
        }

        if (!hierarchyNav.has(path)){
          hierarchyNav.set(path, {});
          const extracted = await extractPropsFromObject(proto, path);
          hierarchyNav.set(path, extracted);
          if (!path.includes('${basePath}.')) {
            detached[name] = extracted;
          }
        }
      } catch (err) {
      }
    }
    return hierarchy;
  }

  async function extractPropValue(obj, key, path, isInherited) {
    if (obj === null || obj === undefined || !key) {
      return undefined;
    }

    let accessException;
    let value = await new Promise(async (resolve, reject) => {
      let didResolve = false;
      // if you wait on a promise, it will hang!
      const t = setTimeout(() => reject('Likely a Promise'), 600);
      try {
         const p = await obj[key];
         if (didResolve) return;
         didResolve = true;
         clearTimeout(t);
         resolve(p);
       } catch(err) {
         if (didResolve) return;
         clearTimeout(t);
         reject(err);
       }
    }).catch(err => {
       accessException = err;
    });

    if (
      value && path !== '${basePath}.document' &&
      (typeof value === 'function' || typeof value === 'object' || typeof value === 'symbol')
    ) {
      if (loadedObjects.has(value)) {
        // TODO: re-enable invoking re-used functions once we are on stable ground with chrome flags
        const shouldContinue = false; //typeof value === 'function' && (isInherited || !path.replace(String(key), '').includes(String(key)));
        if (!shouldContinue) return 'REF: ' + loadedObjects.get(value);
      }
      // safari will end up in an infinite loop since each plugin is a new object as your traverse
      if (path.includes('.navigator') && path.endsWith('.enabledPlugin')) {
        return 'REF: ${basePath}.navigator.plugins.X'
      }
      loadedObjects.set(value, path);
    }

    let details = {};
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      details = await extractPropsFromObject(value, path);
    }
    const descriptor = await getDescriptor(obj, key, accessException, path);

    if (!Object.keys(descriptor).length && !Object.keys(details).length) return undefined;
    const prop = Object.assign(details, descriptor);
    if (prop._$value === 'REF: ' + path) {
      prop._$value = undefined;
    }

    return prop;
  }

  async function getDescriptor(obj, key, accessException, path) {
    const objDesc = Object.getOwnPropertyDescriptor(obj, key);

    if (!objDesc) {
      const plainObject = {};

      if (accessException && String(accessException).includes( 'Likely a Promise')) {
        plainObject._$value = 'Likely a Promise';
      }
      else if (accessException) return plainObject;
      let value;
      try {
        value = obj[key];
      } catch (err) { }

      let type = typeof value;
      if (value && Array.isArray(value)) type = 'array';

      const functionDetails = await getFunctionDetails(value, obj, key, type, path);
      plainObject._$type = functionDetails.type;
      plainObject._$value = getValueString(value, key);
      plainObject._$function = functionDetails.func;
      plainObject._$invocation = functionDetails.invocation;

      return plainObject;
    } else {
      let value;
      try {
        value = objDesc.value;
        if (!value && !accessException) {
          value = obj[key];
        }
      } catch (err) {}

      let type = typeof value;
      value = getValueString(value, key);
      const functionDetails = await getFunctionDetails(value, obj, key, type, path);
      type = functionDetails.type;

      const flags = [];
      if (objDesc.configurable) flags.push('c');
      if (objDesc.enumerable) flags.push('e');
      if (objDesc.writable) flags.push('w');

      return {
        _$type: type,
        _$function: functionDetails.func,
        _$invocation: functionDetails.invocation,
        _$flags: flags.join(''),
        _$accessException: accessException ? accessException.toString() : undefined,
        _$value: value,
        _$get: objDesc.get ? objDesc.get.toString() : undefined,
        _$set: objDesc.set ? objDesc.set.toString() : undefined,
        _$getToStringToString: objDesc.get ? objDesc.get.toString.toString() : undefined,
        _$setToStringToString: objDesc.set ? objDesc.set.toString.toString() : undefined,
      };
    }
  }

  async function getFunctionDetails(value, obj, key, type, path) {
    let func;
    let invocation;
    if (type === 'undefined') type = undefined;
    if (type === 'function') {
      try {
        func = String(value);
      } catch (err) {
        func = err.toString();
      }
      try {
        if (!doNotInvoke.includes(key) && !doNotInvoke.includes(path) && !value.prototype) {
          invocation = await new Promise(async (resolve, reject) => {
            const c = setTimeout(() => reject('Promise-like'), 650);
            let didReply = false;
            try {
              let answer = obj[key]();
              if (answer && answer.on) {
                answer.on('error', err => {
                  console.log('Error', err, obj, key)
                })
              }
              answer = await answer;

              if (didReply) return;
              clearTimeout(c);
              didReply = true;
              resolve(answer);
            } catch(err) {
              if (didReply) return;
              console.log(path)
              didReply = true;
              clearTimeout(c);
              reject(err);
            }
          });
        }
      } catch(err) {
        invocation = err ? err.toString() : err;
      }
    }

    return {
      type,
      func,
      invocation: getValueString(invocation),
    }
  }

  function getValueString(value, key){
    if (key && skipValues.includes(key)) {
      return 'SKIPPED VALUE';
    }

    try {
      if (value && typeof value === 'symbol') {
        value = '' + String(value);
      }
      else if (value && (value instanceof Promise || typeof value.then === 'function'))  {
         value = 'Promise';
      }
      else if (value && typeof value === 'object') {
        if (loadedObjects.has(value)) {
          return 'REF: ' + loadedObjects.get(value);
        }
      }
      else if (value && typeof value === 'string') {
        const url = '${ctx.url.href}';
        const host = '${ctx.url.host}';
        while (value.includes(url)) {
          value = value.replace(url, '<url>')
        }
        while (value.includes(host)) {
          value = value.replace(host, '<host>')
        }

        value = value.replace(/<url>\:\d+\:\d+/g, '<url>:<lines>');
      }
    } catch(err) {
      value = err.toString();
    }
    return value;
  }

  function getObjectName(obj) {
    if (obj === Object) return 'Object';
    if (obj === Object.prototype) return 'Object.prototype';
    try {
      if (typeof obj === 'symbol') {
        return '' + String(obj);
      }
    } catch (err) {}
    try {
      let name = obj[Symbol.toStringTag];
      if (!name) {
        try {
          name = obj.name;
        } catch(err) {}
      }

      if (obj.constructor) {
        const constructorName = obj.constructor.name;

        if (constructorName && constructorName !== Function.name && constructorName !== Object.name) {
          name = constructorName
        }
      }

      if ('prototype' in obj) {
        name = obj.prototype[Symbol.toStringTag] || obj.prototype.name || name;
        if (name) return name;
      }

      if (typeof obj === 'function') {
        if (name && name !== Function.name) return name;
        return obj.constructor.name;
      }

      if (!name) return;

      return name + '.prototype';
    } catch (err) {}
  }

  self.addEventListener("unhandledrejection", function(promiseRejectionEvent) {
    console.log(promiseRejectionEvent);
  });

  self.afterQueueComplete = async (testType = '${PageNames.BrowserDom}') => {
    await new Promise(resolve => setTimeout(resolve, 1e3));
    const props = await extractPropsFromObject(self, '${basePath}');
    return fetch("${ctx.buildUrl('/save')}", {
      method: 'POST',
      body: JSON.stringify({
        ${basePath}: props,
        detached,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Page-Name': testType
      },
    });
  }
})();`;
}
