#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedDefaults, NSObject)

RCT_EXTERN_METHOD(set:(NSString *)groupId key:(NSString *)key value:(NSString *)value)

RCT_EXTERN_METHOD(get:(NSString *)groupId
                  key:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPendingLogs:(NSString *)groupId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
