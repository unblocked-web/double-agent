// ToDo: ensure that xhr requests that should have Preflight has Preflight
// const xhrPreflightRequestsExpected = ctx.session.requests.filter(
//     x =>
//         x.resourceType === ResourceType.Xhr &&
//         x.secureDomain === ctx.requestDetails.secureDomain &&
//         x.originType !== OriginType.SameOrigin,
// ).length;
// const isXhrFlagged = xhrPreflightRequestsExpected === 0;
//
// const preflights = ctx.session.requests.filter(x => x.resourceType === ResourceType.Preflight)
//     .length;
