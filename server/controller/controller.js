
const bcrypt = require('bcrypt')
const UserSchema = require('../model/model')
const productSchema = require('../model/product_model')
const categorySchema = require('../model/add_category')
const mongoose = require('mongoose')
const cartSchema =require('../model/cart')
const order_model = require('../model/order')
const couponSchema = require('../model/coupon')
const paypal=require('paypal-rest-sdk')


require('dotenv').config();


exports.login = (req, res) => {
    res.render("login");
  };
  exports.signup=(req,res)=>{
    res.render("signUp")
  }
 
// index
exports.index= async(req,res)=>{
  product = await productSchema.find().limit(4);
  if(req.session.authorized){
    const User = req.session.user
    
    // product = await productSchema.find().limit(4);
    res.render('index',{User,product});
  }else{
    // const product = await productSchema.find().limit(4)
    res.render('index', { product });
  }

}


//add addrress
exports.addaddress = async (req,res)=>{
  const User = req.session.user

  console.log(User,"PSoakkscnanvambnv")
  
    try{
    
      const userId = req.session.user?._id;   
      const data = await UserSchema.findOne({_id:userId})
      const coupon = await couponSchema.find()
      const cart = await cartSchema.findOne({ userId: userId }).populate(
        "products.productId")

      const {firstName,lastName,address, phone, pincode, city,email  } = req.body
      
      // Find the user by a specific identifier
      const user = await UserSchema.findOne({_id:userId});
      if (!user) {
        res.status(404).send('User not found.');
        return;
      }
      // Push the new address data to the existing address array
      user.address.push({ firstName, lastName,address, phone, pincode, city,email });
      
      // Save the updated user document
      await user.save();
      if (cart) {
        const products = cart.products
        let subtotal = 0;
      for (const product of products) {
        subtotal += product.productId.price * product.quantity;
      }

      res.render("checkout",{ User,coupon, products,cart, data: data.address,subtotal })
      }
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Error finding/updating user.');
  }
}




exports.deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    console.log(addressId);
    const userId = req.session.user?._id;
    console.log(userId);
    const address = await UserSchema.findOneAndUpdate(
      { _id: userId },
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );
   

    if (address) {
      res.redirect("/checkout");
    } else {
      console.log("Address not deleted");
      res.redirect("/cart");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};




//signup


// single product

exports.single_product = async (req, res) => {
  try {
    const product_id = req.params.id;
    console.log(product_id);
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).send('Invalid product ID');
    }
  
    const product = await productSchema.findById(product_id);
    if (!product) {
      return res.status(404).send('Product not found');
    }
    const User = req.session.user
    
    const products = await productSchema.find().skip(4).limit(4)
    
    res.render('single_product', { User,product,products});
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
 }
};
//show product
exports.shop = async (req, res) => {
  try{
    
    const products = await productSchema.find();
  const Category = await categorySchema.find();
  const User = req.session.user
  res.render("shop", { products,Category,User }); 
  } catch(error){
    console.log(error);
    res.status(500).sens({error:"internal server error"})
  }
  
};


exports.checkout = async (req, res) => {
  const User = req.session.user

  try {
    const userId = req.session.user?._id;   
    const data = await UserSchema.findOne({ _id: userId });
  
    const coupon = await couponSchema.find();
    const cart = await cartSchema.findOne({ userId: userId }).populate(
      "products.productId")
      const items = cart.products.map((item) => {
        const product = item.productId;
        const quantity = item.quantity;
        const price = product.price;
        if (!price) {
          throw new Error("Product price is required");
        }
        if (!product) {
          throw new Error("Product is required");
        }
  
        return {
          product: product._id,
          quantity: quantity,
          price: price,
        };

      })

      let totalPrice =0
      items.forEach((item) => {
        totalPrice += item.price * item.quantity;
      });
      console.log(totalPrice);
      const upcart = await cartSchema.findOneAndUpdate({ userId: userId },{
        total:totalPrice
      })


    if (cart) {
      console.log(cart)
      const products = cart.products;
     

      res.render('checkout', { User,data, coupon, products, cart, data: data.address });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Some error occurred');
  }
};



exports.contact = (req, res) => {
    res.render("contact");
  };
  //payment
exports.payment = async (req, res) => {

  try{

    const id = req.params.id
    const userId = req.session.user?._id
    const cart = await cartSchema.findOne({ userId: userId }).populate(
      "products.productId")
    const user = await UserSchema.findOne(
      { _id: userId},
      { address: { $elemMatch: { _id: id } } }
    );
if(user){
  const products = cart.products
  let subtotal = 0;
  for (const product of products) {
    subtotal += product.productId.price * product.quantity;
  }

   const address = user.address[0]

    res.render("payment",{address,subtotal});
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Some Error occurred')
};
}

exports.blog = (req, res) => {
    res.render("blog");
  };


  exports.about = (req, res) => {
    res.render("about");
  };





let paypalTotal = 0;
exports.placeOrder = async (req, res) => {

  if (req.session.user) {
    try {
      const payment = req.body.payment_method
      
      const User = req.session.user
      const userId = req.session.user?._id
      const id = req.params.id
      

      const cartdisc= await cartSchema.findOne({userId:userId})
     
    

      const userModel = await UserSchema.findById(userId)

      const addressIndex = userModel.address.findIndex((item) =>
        item._id.equals(id)
      )

      const specifiedAddress = userModel.address[addressIndex]


      const cart = await cartSchema.findOne({ userId: userId }).populate("products.productId")
      cart ? console.log(cart) : console.log("Cart not found");

      const items = cart.products.map(item => {
        const product = item.productId;
        const quantity = item.quantity;
        const price = product.price;

        if (!price) {
          throw new Error("Product price is required");
        }
        if (!product) {
          throw new Error("Product is required");
        }

        return {
          product: product._id,
          quantity: quantity,
          price: price,
        }

      })

      console.log(items);

      

      let totalPrice = cartdisc.total-cartdisc.discount
     

    console.log(totalPrice,"bdcmebfmjerwhfkerf")

      // will continue
      if (payment == "COD") {
        console.log("99999");

        const order = new order_model({
          user: userId,
          items: items,
          total: totalPrice,
          status: "Pending",
          payment_method: payment,
          createdAt: new Date(),
          shipping_charge: 50,
          address: specifiedAddress,
        });
        let data = order
        await order.save()


        await cartSchema.deleteOne({ userId: userId });

        res.render('confirm', { User, userId, specifiedAddress, cart, payment, data, totalPrice })
      }
      
      
      else if (payment == "paypal") {

        console.log("990099");


        const order = new order_model({
          user: userId,
          items: items,
          total: totalPrice,
          status: "Pending",
          payment_method: payment,
          createdAt: new Date(),
          shipping_charge: 50,
          address: specifiedAddress,
          
        })
        await order.save()
        
        cart.products.forEach((element) => {
          paypalTotal += totalPrice;
        });
        
        
        console.log("createPayment");
        
        let createPayment = {
          intent: "sale",
          payer: { payment_method: "paypal" },
          redirect_urls: {
            return_url: `http://localhost:3000/paypalSuccess/${userId}`,
            cancel_url: "http://localhost:3000/paypal_err",
          },
          transactions: [
            {
              amount: {
                currency: "USD",
                total: (paypalTotal / 82).toFixed(2), // Divide by 82 to convert to USD
              },
              description: "Super User Paypal Payment",
            },
          ],
        };
        
        paypal.payment.create(createPayment, function (error, payment) {
          console.log("error","567");
          if (error) {
            throw error;
          } else {
            for (let i = 0; i < payment.links.length; i++) {
              if (payment.links[i].rel === "approval_url") {
                res.redirect(payment.links[i].href);
              }
            }
          }
        });
        
        await cartSchema.deleteOne({ userId: userId });
        
      }
      
      
    } catch (error) {
      console.log(error);
      res.status(500).send("network error")
    }

  } else {
    res.redirect("/")
  }
}


exports.paypal_success = async (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
   const userId = req.params.id
   const User = await UserSchema.findById(userId)
   req.session.user=User
  
  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": paypalTotal
      }
    }]
  };
  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
    

    
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      
      // console.log(JSON.stringify(payment));
      console.log(User,"dnbjaehbfeajhbfjv---------------------------")
      res.render("paypalSuccess", { payment, User, userId, })
    }
  });
  
}


exports.paypal_err = (req, res) => {
  console.log(req.query);
  res.send("error")
}


  exports.find_user = async (req, res) => {
    if (!req.body.email || req.body.email.trim() === "" || !req.body.password || req.body.password.trim() === "") {
      // const product = await productSchema.find().limit(4)
      return res.status(400).render("login",{ msg: "Email and password are required."});
    }
    const email = req.body.email;
  
    const password = req.body.password;
  console.log(email,"haahaa");
    try {
      const User = await UserSchema.findOne({ email: email });
  
      if (User) {
        if(User.isBlocked){
          const product = await productSchema.find().limit(4)
          res.render("login",{product, msg: "user is blocked" })
        }else{
          const isMatch = await bcrypt.compare(password, User.password);
  
        if (isMatch) {
          
          req.session.user = User; // Store the user ID in the session
          req.session.authorized = true; 
        User.isLogedin = true;
        await User.save(); // Save the updated user
        
        res.redirect("/index",);
       
        } else {
          const product = await productSchema.find().limit(4)
          res.render("login", {product, msg: "Invalid entry" });
        }
        }
        
      }else{
        const product = await productSchema.find().limit(4)
          res.render("login", {product, msg: "You need to Signup first!" });
      }
    } catch (error) {
      console.error(error);
      res.send("An error occurred while logging in.");
    }
  };


  exports.create = (req, res) => {
    const saltRounds = 10; // You can adjust the number of salt rounds as needed
  
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) {
        res.status(500).send({
          message:
            err.message || "Some error occurred while hashing the password",
        });
        return;
      }
  
      const user = new UserSchema({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: hash,
        confirmPassword:hash
      });
  
      user
        .save()
        .then(() => {
          res.render("login", { msg: "successfully registered" });
        })
        .catch((err) => {
          res.status(500).send({
            message:
              err.message ||
              "Some error occurred while creating a create operation",
          });
        });
    });
  };

//logout
exports.log_out = async (req, res) => {
  const { id } = req.params;
  const User = await UserSchema.findByIdAndUpdate(id, {
    isLogedin: false,
  })
  
    req.session.user = null
    res.redirect("/index")
 
};

exports.userCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const User = req.session.user;
    const cart = await cartSchema.findOne({ userId: userId }).populate('products.productId');

    if (cart) {
      const products = cart.products;
      const cartId = cart._id;
      res.render('cart', { User, products, cartId, cart });
    } else {
      res.render('empty_cart', { User });
    }

  } catch (error) {
    console.log(error);
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const productId = req.params.id;

    let userCart = await cartSchema.findOne({ userId: userId });
    if (!userCart) {
      const newCart = await new cartSchema({ userId: userId, products: [] });
      await newCart.save();

      userCart = newCart;
    }

    const productIndex = userCart?.products.findIndex(
      (product) => product.productId == productId
    );

    if (productIndex === -1) {
      userCart.products.push({ productId, quantity: 1 });
    } else {
      userCart.products[productIndex].quantity += 1;
    }

    await userCart.save();

     res.redirect(userCart.products.length > 0 ? '/viewcart' : '/empty_cart');

  } catch (error) {
    console.log(error);
  }
};

exports.deleteCartItem = async (req, res) => {
  try {
    
      const productId = req.params.id
      const userId = req.session.user?._id
      const productDeleted = await cartSchema.findOneAndUpdate(
          {userId: userId},
          {$pull:{ products:{productId: productId}}},
          {new: true}
      )
      if(productDeleted) {
          res.redirect("/viewcart")
      } else {
          console.log("product not deleted");
      }
  } catch (error) {
      console.log(error);
      res.status(500).send("Server Error")
  }
}

exports.incrementQuantity = async (req, res) => {
  const userId = req.session.user?._id;
  const cartId = req.body.cartId;

  try {
    let cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");
    let cartItem = cart.products.find((item) => item.productId._id.equals(cartId));

    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    cartItem.quantity += 1;
    await cart.save();

    const total = cartItem.quantity * cartItem.productId.price;
    const quantity = cartItem.quantity;

    res.json({ success: true, total, quantity });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to update quantity" });
   }
};

exports.decrementQuantity = async (req, res) => {
  const cartItemId = req.body.cartItemId;
  const userId = req.session.user?._id;
 
  try {
    const cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");
    const cartItem = cart.products.find((item) => item.productId._id.equals(cartItemId));
    


    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;
      await cart.save();
    }

    const total = cartItem.quantity * cartItem.productId.price;
    const quantity = cartItem.quantity;

    res.json({ success: true, total, quantity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update quantity" });
  }
};


//order page
exports.order_details = async (req,res)=>{
  const User = req.session.user
  try {
    const id =req.params.id;
    const order_data = await order_model.find({user:id}).populate("items.product").populate("items.quantity")
    console.log(order_data);
    

    res.render("orders", {  order_data, User });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

//order cancel
exports.ordercancel = async (req, res) => {
  try {
    const id = req.session.user?._id
    const orderId = req.params.id;
    const cancelled ="cancelled"
    // Update the order using findByIdAndUpdate
    await order_model.findByIdAndUpdate(orderId, { status: cancelled });
    const order_data = await order_model.find({user:id}).populate("items.product").populate("items.quantity")
    res.render('orders',{order_data});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

// order details
exports.orderdetailspage =async (req,res)=>{
  const User=req.session.user
  try{
    const id = req.params.id;

    
    const order_data = await order_model.findOne({_id: id}).populate("user").populate("items.product").populate("items.quantity")
   console.log(order_data);
   res.render('order_detail',{order_data,User})
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

//search product 
exports.search_product = async (req, res) => {
  try {
    const pro = req.body.product;
    console.log(pro, "dnbsjvsedv");
    const products = await productSchema.find({ name: { $regex: new RegExp(pro, 'i') } });
    const Category = await categorySchema.find();
    const User = req.session.user;
    const product = await productSchema.find();
    
    if (products.length > 0) {
      res.render('shop', { User, Category, product, products });
    } else {
      res.render('shop', { User, Category, product, message: "There are no products" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


//price range
exports.pricerange = async (req,res)=>{
  try{
    const Category = await categorySchema.find();
    const User = req.session.user;
    const min_price = req.body.min_price;
    const max_price = req.body.max_price;
    console.log(min_price,max_price);
    const product = await productSchema.find({
      price: { $gte: min_price, $lte: max_price }
    });
    console.log(product);
    if(product){
      res.render('shop',{User,Category,product});
    }if(product==null){
      const product = await productSchema.find();
      res.render('shop',{User,Category,product, msg:"there is no products in this price range"});
    }
  }catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

exports.coupon = async (req,res)=>{

  try{

  
  const user_id = req.session.user?._id;
  const code = req.body.coupon;
  console.log(code,"asddded");
  const coupon = await couponSchema.findOne({code:code});
  console.log(coupon,"bfebmerfmehrf");
  if(coupon){
    const currentDate = new Date()
    const expDate = new Date(coupon.expiryDate)
    console.log(currentDate,expDate);
    const User = await UserSchema.findById(user_id)
    const couponIndex = User.coupons.findIndex(item => item === code);
    console.log(couponIndex);
    const foundcoupon = User.coupons[couponIndex]
    if(currentDate > expDate){
      console.log("1258");
      res.redirect('/checkout')
    }
    else if(foundcoupon){
      console.log("kk");
      res.redirect('/checkout')
    }else{
      const cart = await cartSchema.findOne({ userId: user_id }).populate(
      "products.productId")
      const items = cart.products.map((item) => {
        const product = item.productId;
        console.log(product)
        
        if (!product) {
          throw new Error("Product is required");
        }
  
        return {
          product: product._id,
          
        };

      })
      

        

      
          const discount = coupon.discount
          await cartSchema.findOneAndUpdate({ userId: user_id }, { discount: discount });
            User.coupons.push(coupon.code);
          

          await User.save();
        
        console.log("123");
        return res.redirect('/checkout');
      }
    } else {
      console.log("12");
      return res.redirect('/checkout');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


//profile
exports.profile = async (req,res)=>{
  try{
    const id = req.params.id
    const User = await UserSchema.findById(id)
    if(User){
      res.render('profile',{User})
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}



