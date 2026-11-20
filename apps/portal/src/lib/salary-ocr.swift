import Foundation
import Vision
import ImageIO

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let width = properties[kCGImagePropertyPixelWidth] as? Int,
      let height = properties[kCGImagePropertyPixelHeight] as? Int,
      width * height <= 40_000_000 else { exit(2) }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en-US"]
request.minimumTextHeight = 0.004
try VNImageRequestHandler(url: url, options: [:]).perform([request])
let blocks: [[String: Any]] = (request.results ?? []).compactMap { result in
    guard let candidate = result.topCandidates(1).first else { return nil }
    return ["text": candidate.string, "confidence": candidate.confidence,
            "x": result.boundingBox.minX, "y": result.boundingBox.midY,
            "width": result.boundingBox.width]
}
let output = try JSONSerialization.data(withJSONObject: blocks)
FileHandle.standardOutput.write(output)
