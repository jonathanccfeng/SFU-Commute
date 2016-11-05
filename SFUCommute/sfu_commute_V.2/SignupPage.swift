//
//  File.swift
//  sfu_commute_V.2
//
//  Created by jyotsna jaswal on 2016-10-22.
//  Copyright © 2016 jyotsna jaswal. All rights reserved.
//

import Foundation
import UIKit
import EasyTipView
import Alamofire
import SwiftyButton

class SignupPage: UIViewController {
    
    @IBOutlet weak var email: UITextField!
    @IBOutlet weak var password: UITextField!
    @IBOutlet weak var confirmPassword: UITextField!
    @IBOutlet weak var phoneNumber: UITextField!
    @IBOutlet weak var firstName: UITextField!
    @IBOutlet weak var lastName: UITextField!
    @IBOutlet weak var error: UILabel!
    @IBOutlet weak var registerUI: UIButton!
    var preferences = EasyTipView.Preferences()
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        email.text           = "email"
        password.text        = "password"
        confirmPassword.text = "confirm password"
        phoneNumber.text     = "phone number"
        firstName.text       = "first name"
        lastName.text        = "last name"
        initTips()
    }
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        self.view.endEditing(true)
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
    }
    
    func initTips() {
        preferences.drawing.font            = UIFont(name: "Futura-Medium", size: 13)!
        preferences.drawing.foregroundColor = UIColor.white
        preferences.drawing.backgroundColor = Colors.SFUBlue
        preferences.drawing.arrowPosition   = EasyTipView.ArrowPosition.bottom
        EasyTipView.globalPreferences       = preferences
    }
    
    func forData() {
        let emailText     =  String(email.text!)
        let passwordText  =  String(password.text!)
        let firstNameText =  String(firstName.text!)
        let lastNameText  =  String(lastName.text!)
        
        if let url = URL(string: "http://54.69.64.180/signup") {
            var request        = URLRequest(url: url)
            request.httpMethod = "POST"
            var postString     = "{\"email\": \""
            postString        += emailText!
            postString        += "\", \"password\": \""
            postString        += passwordText!
            postString        += "\", \"firstname\" : \"" + firstNameText!
            postString        += "\", \"lastname\":\"" + lastNameText! + "\"}"
            request.httpBody   = postString.data(using: .utf8)
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-type")
            URLSession.shared.dataTask(with: request, completionHandler: { (data, response, body) in
                let json = try? JSONSerialization.jsonObject(with: data!, options: .allowFragments)
                print(json)
                //print(json["error"])
                let dict    = json as? NSDictionary
                let success = String(describing: dict!["success"])
                //let boolValue = Bool(success)
                print("bool value is causing problem:----?")
                print(success)
                if (success == "Optional(1)"){
                    print("was i even here at all")
                    let access_key = String(describing: dict!["access_token"])
                    AuthorizedRequest.adapter = AccessTokenAdapter.init(accessToken: access_key)
                    print(access_key)
                    self.shouldPerformSegue(withIdentifier: "VerificationPage", sender: self)
                    
                }
                else{
                    //DispatchQueue.main.async(){
                    print("I am here now!!!!! Error Time....")
                    //let errmsg = String(describing: dict!["errmsg"])
                    //print(errmsg)
                    let textFieldTips = EasyTipView(text: ("Sign up failed"), preferences: self.preferences)
                    textFieldTips.dismiss()
                    textFieldTips.show(forView: self.registerUI!)
                    //textFieldTips.dismiss()
                    //}
                }
            }).resume()
        }
    }
    
    @IBAction func register(_ sender: AnyObject) {
        let enteredPassword       = password.text!
        let enteredCofirmPassword = confirmPassword.text!
        let textFieldTips         = EasyTipView(text: "The password and confirm password field did not match", preferences: preferences)
        if (enteredPassword      != enteredCofirmPassword) {
            print("I am here!!!!!!!!!!!!!!!!!!!!!!!!!!")
            //textFieldTips.dismiss()
            textFieldTips.show(forView: password)
            //textFieldTips.dismiss()
            //'self.viewDidLoad()
        }
        else {
            forData()
        }
    }
    
    @IBAction func cancel(_ sender: AnyObject) {
        let CurrentViewController = self.storyboard?.instantiateViewController(withIdentifier: "ViewController")
        self.navigationController?.pushViewController(CurrentViewController!, animated: true)
    }
}
