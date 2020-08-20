// ToDo: ensure assets are loaded, otherwise probably bot
// if (ctx.requestDetails.resourceType === ResourceType.Document) {
//   for (const expectedLoad of ctx.session.expectedAssets) {
//     // don't check current urls
//     if (expectedLoad.fromUrl === ctx.requestDetails.url) continue;
//
//     const hasLoad = ctx.session.requests.some(
//         x =>
//             x.resourceType === expectedLoad.resourceType &&
//             x.domainType === expectedLoad.domainType &&
//             x.secureDomain === expectedLoad.secureDomain,
//     );
//     if (!hasLoad) {
//       if (
//           !ctx.session.assetsNotLoaded.some(
//               x =>
//                   x.resourceType === expectedLoad.resourceType &&
//                   x.originType === expectedLoad.originType &&
//                   x.secureDomain === expectedLoad.secureDomain &&
//                   x.domainType === expectedLoad.domainType,
//           )
//       ) {
//         ctx.session.assetsNotLoaded.push(expectedLoad);
//       }
//     }
//   }
// }
