import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';

export default function domScript(
  ctx: IRequestContext,
  skipProps = ['testCodecs', 'Fingerprint2', 'pageQueue'],
) {
  return `
  <script type="text/javascript">
  (() => {
    const skipProps = ${JSON.stringify(skipProps)};
    const loadedObjects = new Map([[window, 'window']]);
    const heirarchyNav = new Map();
    const detached = {};

    async function extractPropsFromObject(obj, parentPath) {
      let keys = [];
      let symbols = [];
      try {
        for (let key of Object.getOwnPropertyNames(obj)) {
          if (key === 'document') continue;
          if (!keys.includes(key)) keys.push(key);
        }
      } catch (err) {}
      try {
        symbols = Object.getOwnPropertySymbols(obj);
        for (let key of symbols) {
          if (!keys.includes(key)) keys.push(key);
        }
      } catch (err) {}
      
      let proto = obj;
      while (!!proto) {
        proto = Object.getPrototypeOf(proto);

        if (!proto) break;

        try {
          let name = getObjectName(proto);
          
          const path = window[name] || name === 'Object.prototype' ? 'window.' + name : 'detached.' + name;
          if (!heirarchyNav.has(path)){            
            heirarchyNav.set(path, {});
            const extracted = await extractPropsFromObject(proto, path);
            heirarchyNav.set(path, extracted);
            if (!path.includes('window.')) {
              detached[name] = extracted;
            }
          }
        } catch (err) {
        }
      }
    
      const newObj = {
        _protos: getProtoHierarchy(obj),
      };
      
      if (!newObj._protos.length) delete newObj._protos;
      
      for (const key of keys) {
        if (skipProps.includes(key)) {
          newObj[key] = 'SKIPPED';
          continue;
        }
        if (key === 'constructor') continue;
        
        const path = parentPath + '.' + String(key);
        
        if (heirarchyNav.has(path)) {
          newObj['' + String(key)] = heirarchyNav.get(path);
          continue;
        }
        
        try {
          newObj['' + String(key)] = await extractPropValue(obj, key, path);
        } catch (err) {
          newObj['' + String(key)] = err.stack;
        }
      }
      
      return newObj;
    }

    async function extractPropValue(obj, key, path) {
      
      if (obj === null || obj === undefined || !key) {
        return undefined;
      }
      
      let accessException;
      let value = await new Promise(async (resolve, reject) => {
        try {
           // if you wait on a promise, it will hang!
           const t = setTimeout(() => reject('Likely a Promise'), 10);
           const p = await obj[key];
           clearTimeout(t);
           resolve(p);
         } catch(err) {
           reject(err);
         }
      }).catch(err => {
         accessException = err;
      });

      if (
        value &&
        (typeof value === 'function' || typeof value === 'object' || typeof value === 'symbol')
      ) {
        if (loadedObjects.has(value)) {
          return 'REF: ' + loadedObjects.get(value);
        }
        loadedObjects.set(value, path);
      }

      let details ={};
      if (value && (typeof value === 'object' || typeof value === 'function')) {
        details = await extractPropsFromObject(value, path);
      } 
      const descriptor = getDescriptor(obj, key, accessException);
      return {
        ...details,
        ...descriptor,
      }
    }

    function getDescriptor(obj, key, accessException) {
      let objDesc;
      let proto = obj;
      while (true) {
        objDesc = Object.getOwnPropertyDescriptor(proto, key);
        if (objDesc) {
          break;
        }
        proto = Object.getPrototypeOf(proto);

        if (!proto) {
          break;
        } 
      }

      if (!objDesc) {
        try {
          return String(obj[key]);
        } catch (err) {
          return err.toString();
        }
      } else {
        let value;
        try {
          value = objDesc.value;
          if (!value && !objDesc.get && !accessException) {
            value = obj[key];
          }
        } catch (err) {}
        
        let type = typeof value;
        try {
          if (value && typeof value === 'symbol') {
            value = '' + String(value);
          }
          if (value && typeof value === 'object') {
            if (value instanceof Promise || (typeof value.then === 'function'))  {
              value = 'Promise';
            } else {
              value = String(value);
            }
          }
        } catch(err) {
          value = err.toString();
        }
        
        let func;
        if (type === 'undefined') type = undefined;
        if (type === 'function') {
          type = undefined; 
          try {
            func = String(value);
          } catch (err) {
            func = err.toString();
          }
        }
        const flags = [];
        if (objDesc.configurable) flags.push('c');
        if (objDesc.enumerable) flags.push('e');
        if (objDesc.writable) flags.push('w');
       
        return {
          type,
          function: func,
          flags: flags.join(''),
          accessException: accessException ? accessException.toString() : undefined,
          value,
          get: objDesc.get ? objDesc.get.toString() : undefined,
          set: objDesc.set ? objDesc.set.toString() : undefined,
          getToStringToString: objDesc.get ? objDesc.get.toString.toString() : undefined,
          setToStringToString: objDesc.set ? objDesc.set.toString.toString() : undefined,
        };
      }
    }

    function getProtoHierarchy(obj, hierarchy = []) {
      if (typeof obj === 'function') return hierarchy;
      const proto = Object.getPrototypeOf(obj);
      if (!proto) {
        return hierarchy;
      }
      hierarchy.push(getObjectName(proto));
      return getProtoHierarchy(proto, hierarchy);
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
        if (obj.constructor) return obj.constructor.name;
        return  obj[Symbol.toStringTag] || obj.name;
      } catch (err) {}
    }
    
    const promise = extractPropsFromObject(window, 'window').then(props => {
      console.log('done', { props, detached});

      return fetch("${ctx.trackUrl('/dom')}", {
        method: 'POST',
        body: JSON.stringify({
          dom: {
            window: props,
            detached,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
    window.pageQueue.push(promise);
  })();
</script>;`;
}
