import XCTest

final class MobileSmoke: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["Synthetic iOS smoke"].waitForExistence(timeout: 20))
    }

    override func tearDownWithError() throws {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        app.terminate()
    }

    func open(_ scenario: String) {
        app.links["Fixture \(scenario)"].tap()
    }

    func field(_ placeholder: String) -> XCUIElement {
        let element = app.descendants(matching: .any).matching(NSPredicate(format: "placeholderValue == %@", placeholder)).firstMatch
        XCTAssertTrue(element.waitForExistence(timeout: 20), "Missing accessible text entry: \(placeholder)")
        return element
    }

    func reveal(_ element: XCUIElement) {
        for _ in 0..<8 {
            if element.isHittable { return }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, "Action must remain reachable")
    }

    func testCustomAskWithNativeKeyboard() {
        open("ask")
        let answer = field("Type your own answer…")
        reveal(answer)
        answer.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "Real simulator software keyboard must open")
        answer.typeText("Synthetic custom iOS answer")
        let submit = app.buttons["Submit answer"]
        reveal(submit)
        submit.tap()
        XCTAssertTrue(app.staticTexts["Synthetic assistant continuation received your answer."].waitForExistence(timeout: 20))
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5), "Submitting dismisses software keyboard")
    }

    func testFreeRecallWithNativeKeyboard() {
        open("text")
        let answer = field("Type your answer…")
        reveal(answer)
        answer.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        answer.typeText("Synthetic recall iOS answer")
        let submit = app.buttons["Submit answer"]
        reveal(submit)
        submit.tap()
        XCTAssertTrue(app.staticTexts["Synthetic assistant continuation received your answer."].waitForExistence(timeout: 20))
    }

    func testNewSessionWithNativeKeyboard() {
        open("new")
        let answer = app.textViews.firstMatch
        XCTAssertTrue(answer.waitForExistence(timeout: 20))
        answer.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        answer.typeText("Synthetic new iOS session")
        let send = app.buttons["Send"]
        reveal(send)
        send.tap()
        XCTAssertTrue(app.staticTexts["Synthetic session created"].waitForExistence(timeout: 20))
    }
}
