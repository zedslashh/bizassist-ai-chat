-- Create FAQs table for chatbot knowledge base
CREATE TABLE public.faqs (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  q_en TEXT NOT NULL,
  a_en TEXT NOT NULL,
  q_ta TEXT NOT NULL,
  a_ta TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Allow public read access for chatbot queries
CREATE POLICY "FAQs are publicly readable" 
ON public.faqs 
FOR SELECT 
USING (true);

-- Create index for faster text search
CREATE INDEX idx_faqs_q_en ON public.faqs USING gin(to_tsvector('english', q_en));
CREATE INDEX idx_faqs_domain ON public.faqs (domain);

-- Insert FAQ data
INSERT INTO public.faqs (domain, q_en, a_en, q_ta, a_ta) VALUES
('beauty', 'Is prior booking required?', 'Yes, we recommend booking at least one day in advance.', 'முன்பதிவு அவசியமா?', 'ஆம், குறைந்தபட்சம் ஒரு நாள் முன்பதிவு செய்ய பரிந்துரைக்கப்படுகிறது.'),
('beauty', 'Do you accept digital payments?', 'Yes, we accept UPI, cards, and online payments.', 'நீங்கள் டிஜிட்டல் கட்டணங்களை ஏற்றுக்கொள்கிறீர்களா?', 'ஆம், நாங்கள் UPI, கார்டு மற்றும் ஆன்லைன் கட்டணங்களை ஏற்றுக்கொள்கிறோம்.'),
('beauty', 'What are your salon hours?', 'We are open 10 AM to 8 PM, Monday to Saturday.', 'உங்கள் சலூன் நேரம் என்ன?', 'எங்கள் சலூன் திங்கள் முதல் சனி வரை காலை 10 மணி முதல் இரவு 8 மணி வரை திறந்திருக்கும்.'),
('beauty', 'Do you offer hair straightening?', 'Yes, we offer temporary and permanent hair straightening services.', 'நீங்கள் ஹேர் ஸ்ட்ரெயிட்டனிங் செய்கிறீர்களா?', 'ஆம், எங்களிடம் தற்காலிக மற்றும் நிரந்தர ஹேர் ஸ்ட்ரெயிட்டனிங் சேவைகள் உள்ளன.'),
('health', 'Do you offer online consultations?', 'Yes, online doctor consultations are available by appointment.', 'நீங்கள் ஆன்லைன் ஆலோசனைகள் வழங்குகிறீர்களா?', 'ஆம், நாங்கள் முன்பதிவின் மூலம் ஆன்லைன் டாக்டர் ஆலோசனைகள் வழங்குகிறோம்.'),
('health', 'Do you provide lab tests?', 'Yes, we provide home sample collection and lab tests.', 'நீங்கள் ஆய்வக பரிசோதனைகள் செய்கிறீர்களா?', 'ஆம், நாங்கள் வீட்டில் மாதிரி சேகரிப்பு மற்றும் ஆய்வக பரிசோதனைகளை வழங்குகிறோம்.'),
('health', 'What are your clinic hours?', 'Our clinic is open from 9 AM to 6 PM, Monday to Friday.', 'உங்கள் மருத்துவமனை நேரம் என்ன?', 'எங்கள் மருத்துவமனை திங்கள் முதல் வெள்ளி வரை காலை 9 மணி முதல் மாலை 6 மணி வரை திறந்திருக்கும்.'),
('fitness', 'Do you have personal trainers?', 'Yes, certified personal trainers are available.', 'நீங்கள் தனிப்பட்ட பயிற்சியாளர்களை கொண்டிருக்கிறீர்களா?', 'ஆம், நாங்கள் சான்றளிக்கப்பட்ட தனிப்பட்ட பயிற்சியாளர்களை கொண்டிருக்கிறோம்.'),
('fitness', 'What are your gym timings?', 'We are open 6 AM to 10 PM every day.', 'உங்கள் ஜிம் நேரம் என்ன?', 'எங்கள் ஜிம் தினமும் காலை 6 மணி முதல் இரவு 10 மணி வரை திறந்திருக்கும்.'),
('fitness', 'Do you offer yoga classes?', 'Yes, yoga classes are conducted daily in the morning and evening.', 'நீங்கள் யோகா வகுப்புகளை நடத்துகிறீர்களா?', 'ஆம், யோகா வகுப்புகள் தினமும் காலை மற்றும் மாலை நடைபெறுகின்றன.'),
('education', 'Do you offer scholarships?', 'Yes, scholarships are available based on merit and need.', 'நீங்கள் உதவித்தொகைகள் வழங்குகிறீர்களா?', 'ஆம், திறமை மற்றும் தேவையின் அடிப்படையில் உதவித்தொகைகள் கிடைக்கின்றன.'),
('education', 'What are the school timings?', 'School runs from 8 AM to 3 PM.', 'பள்ளி நேரம் என்ன?', 'பள்ளி காலை 8 மணி முதல் பிற்பகல் 3 மணி வரை நடைபெறுகிறது.'),
('education', 'Do you provide transport?', 'Yes, school bus service is available.', 'நீங்கள் போக்குவரத்து வசதி வழங்குகிறீர்களா?', 'ஆம், பள்ளி பேருந்து சேவை கிடைக்கிறது.'),
('retail', 'Do you offer home delivery?', 'Yes, we deliver within the city limits.', 'நீங்கள் வீட்டிற்கு டெலிவரி செய்கிறீர்களா?', 'ஆம், நகர எல்லைக்குள் டெலிவரி செய்கிறோம்.'),
('retail', 'What is your return policy?', 'Returns are accepted within 7 days with original receipt.', 'உங்கள் திருப்பி அனுப்பும் கொள்கை என்ன?', 'அசல் ரசீதுடன் 7 நாட்களுக்குள் திருப்பி அனுப்பலாம்.'),
('retail', 'Do you offer EMI options?', 'Yes, EMI is available on select products.', 'நீங்கள் EMI வசதி வழங்குகிறீர்களா?', 'ஆம், தேர்ந்தெடுக்கப்பட்ட பொருட்களில் EMI வசதி கிடைக்கிறது.'),
('restaurant', 'Do you offer home delivery?', 'Yes, we deliver within 5 km radius.', 'நீங்கள் வீட்டிற்கு டெலிவரி செய்கிறீர்களா?', 'ஆம், 5 கி.மீ சுற்றளவில் டெலிவரி செய்கிறோம்.'),
('restaurant', 'Do you have vegetarian options?', 'Yes, we have a wide variety of vegetarian dishes.', 'நீங்கள் சைவ உணவு வகைகளை கொண்டிருக்கிறீர்களா?', 'ஆம், எங்களிடம் பல்வேறு சைவ உணவுகள் உள்ளன.'),
('restaurant', 'What are your restaurant timings?', 'We are open from 11 AM to 11 PM.', 'உங்கள் உணவகத்தின் நேரம் என்ன?', 'காலை 11 மணி முதல் இரவு 11 மணி வரை திறந்திருக்கிறோம்.'),
('travel', 'Do you offer tour packages?', 'Yes, we have domestic and international tour packages.', 'நீங்கள் சுற்றுலா பேக்கேஜ்களை வழங்குகிறீர்களா?', 'ஆம், உள்நாட்டு மற்றும் சர்வதேச சுற்றுலா பேக்கேஜ்கள் உள்ளன.'),
('travel', 'Do you provide visa assistance?', 'Yes, we assist with visa applications.', 'நீங்கள் விசா உதவி வழங்குகிறீர்களா?', 'ஆம், விசா விண்ணப்பங்களுக்கு உதவுகிறோம்.'),
('travel', 'Do you offer travel insurance?', 'Yes, travel insurance is available as an add-on.', 'நீங்கள் பயண காப்பீடு வழங்குகிறீர்களா?', 'ஆம், பயண காப்பீடு கூடுதல் சேவையாக கிடைக்கிறது.'),
('real_estate', 'Do you offer home loans?', 'Yes, we assist with home loan applications.', 'நீங்கள் வீட்டுக் கடன் வழங்குகிறீர்களா?', 'ஆம், வீட்டுக் கடன் விண்ணப்பங்களுக்கு உதவுகிறோம்.'),
('real_estate', 'Do you have rental properties?', 'Yes, we have apartments and houses for rent.', 'நீங்கள் வாடகை சொத்துக்களை கொண்டிருக்கிறீர்களா?', 'ஆம், வாடகைக்கு அடுக்குமாடி குடியிருப்புகள் மற்றும் வீடுகள் உள்ளன.'),
('real_estate', 'What documents are needed to buy property?', 'You will need ID proof, address proof, and income documents.', 'சொத்து வாங்க என்ன ஆவணங்கள் தேவை?', 'அடையாள ஆவணம், முகவரி ஆவணம் மற்றும் வருமான ஆவணங்கள் தேவை.'),
('automotive', 'Do you offer test drives?', 'Yes, test drives can be scheduled at our showroom.', 'நீங்கள் டெஸ்ட் டிரைவ் வழங்குகிறீர்களா?', 'ஆம், எங்கள் ஷோரூமில் டெஸ்ட் டிரைவ் திட்டமிடலாம்.'),
('automotive', 'Do you provide servicing?', 'Yes, we have an authorized service center.', 'நீங்கள் சர்வீசிங் வழங்குகிறீர்களா?', 'ஆம், எங்களிடம் அங்கீகரிக்கப்பட்ட சர்வீஸ் சென்டர் உள்ளது.'),
('automotive', 'Do you offer car insurance?', 'Yes, we can assist with car insurance.', 'நீங்கள் கார் காப்பீடு வழங்குகிறீர்களா?', 'ஆம், கார் காப்பீட்டிற்கு உதவுகிறோம்.'),
('legal', 'Do you handle property disputes?', 'Yes, we specialize in property and civil disputes.', 'நீங்கள் சொத்து தகராறுகளை கையாளுகிறீர்களா?', 'ஆம், சொத்து மற்றும் சிவில் தகராறுகளில் நிபுணத்துவம் பெற்றுள்ளோம்.'),
('legal', 'What are your consultation fees?', 'Consultation fees start from Rs. 500.', 'உங்கள் ஆலோசனை கட்டணம் என்ன?', 'ஆலோசனை கட்டணம் ரூ. 500 முதல் தொடங்குகிறது.'),
('legal', 'Do you offer online legal consultations?', 'Yes, online consultations are available via video call.', 'நீங்கள் ஆன்லைன் சட்ட ஆலோசனை வழங்குகிறீர்களா?', 'ஆம், வீடியோ அழைப்பு மூலம் ஆன்லைன் ஆலோசனை கிடைக்கிறது.'),
('banking', 'What documents are needed to open an account?', 'You need ID proof, address proof, and a passport photo.', 'கணக்கு திறக்க என்ன ஆவணங்கள் தேவை?', 'அடையாள ஆவணம், முகவரி ஆவணம் மற்றும் பாஸ்போர்ட் புகைப்படம் தேவை.'),
('banking', 'Do you offer fixed deposits?', 'Yes, we offer FDs with competitive interest rates.', 'நீங்கள் நிலையான வைப்புத்தொகை வழங்குகிறீர்களா?', 'ஆம், போட்டி வட்டி விகிதங்களுடன் FD வழங்குகிறோம்.'),
('banking', 'What are your loan options?', 'We offer personal, home, and vehicle loans.', 'உங்கள் கடன் விருப்பங்கள் என்ன?', 'தனிநபர், வீடு மற்றும் வாகன கடன்கள் வழங்குகிறோம்.'),
('insurance', 'What types of insurance do you offer?', 'We offer life, health, vehicle, and travel insurance.', 'நீங்கள் என்ன வகையான காப்பீடு வழங்குகிறீர்கள்?', 'ஆயுள், சுகாதாரம், வாகனம் மற்றும் பயண காப்பீடு வழங்குகிறோம்.'),
('insurance', 'How do I file a claim?', 'You can file a claim through our website or call center.', 'கோரிக்கையை எவ்வாறு சமர்ப்பிப்பது?', 'எங்கள் இணையதளம் அல்லது கால் சென்டர் மூலம் கோரிக்கை சமர்ப்பிக்கலாம்.'),
('insurance', 'What is the premium for health insurance?', 'Premiums start from Rs. 5000 per year.', 'சுகாதார காப்பீட்டின் பிரீமியம் என்ன?', 'பிரீமியம் ஆண்டுக்கு ரூ. 5000 முதல் தொடங்குகிறது.'),
('general', 'What are your working hours?', 'We are open from 9 AM to 6 PM, Monday to Saturday.', 'உங்கள் வேலை நேரம் என்ன?', 'திங்கள் முதல் சனி வரை காலை 9 மணி முதல் மாலை 6 மணி வரை திறந்திருக்கிறோம்.'),
('general', 'Where are you located?', 'Please check our website for location details.', 'நீங்கள் எங்கே இருக்கிறீர்கள்?', 'இருப்பிட விவரங்களுக்கு எங்கள் இணையதளத்தைப் பாருங்கள்.'),
('general', 'How can I contact you?', 'You can reach us via phone, email, or our website.', 'உங்களை எவ்வாறு தொடர்பு கொள்வது?', 'தொலைபேசி, மின்னஞ்சல் அல்லது எங்கள் இணையதளம் மூலம் தொடர்பு கொள்ளலாம்.'),
('general', 'Do you have a mobile app?', 'Yes, our app is available on Android and iOS.', 'உங்களிடம் மொபைல் ஆப் உள்ளதா?', 'ஆம், எங்கள் ஆப் Android மற்றும் iOS இல் கிடைக்கிறது.');