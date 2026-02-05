import Foundation

@objc public class Codemirror: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
