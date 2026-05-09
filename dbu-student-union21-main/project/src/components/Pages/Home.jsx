/** @format */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Vote, Users, MessageSquare, Building, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import { apiService } from "../../services/api";
import "../../app.css";

export const Home = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	const scrollToSection = (id) => {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};
	const [announcements, setAnnouncements] = useState([]);
	const [isLoadingStats, setIsLoadingStats] = useState(true);
	const [stats, setStats] = useState({
		activeStudents: "0",
		clubs: "0",
		serviceBranches: "0",
		satisfactionRate: "0%"
	});
	const [showElectionModal, setShowElectionModal] = useState(false);
	const [showClubModal, setShowClubModal] = useState(false);
	const [showConcernsModal, setShowConcernsModal] = useState(false);
	const [showServicesModal, setShowServicesModal] = useState(false);
	const [showDeanMore, setShowDeanMore] = useState(false);
	const [showSintayewMore, setShowSintayewMore] = useState(false);

	// Carousel State
	const [currentSlide, setCurrentSlide] = useState(0);

	const carouselSlides = [
		{ id: 1, image: "/image.png/building..jpg" },
		{ id: 2, image: "/image.png/reward1.jpg" },
		{ id: 3, image: "/image.png/reward2.jpg" },
		{ id: 4, image: "/image.png/kal.jpg" },
		{ id: 5, image: "/image.png/5976613440006589280.jpg" },
		{ id: 6, image: "/image.png/holiday.jpg" },
		{ id: 7, image: "/image.png/CAFE.jpg" },
		{ id: 8, image: "/image.png/drgetnet.jpg" },
		{ id: 9, image: "/image.png/5976780750457604990.jpg" },
		{ id: 10, image: "/image.png/5976780750457604994.jpg" },
		{ id: 11, image: "/image.png/5976780750457605001.jpg" },
		{ id: 12, image: "/image.png/add.jpg" },
		{ id: 13, image: "/image.png/gizew.jpg" },
	];

	const carouselCaptions = [
		"Celebrating Our Rich Cultural Heritage",
		"Unity and Diversity at Debre Berhan University",
		"Empowering Students for a Better Success",
		"Student Affairs: The Heart of Campus Life",
	];

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
		}, 5000);
		return () => clearInterval(timer);
	}, [carouselSlides.length]);

	const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
	const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? carouselSlides.length - 1 : prev - 1));

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			setIsLoadingStats(true);
			// Fetch announcements
			const posts = await apiService.getPosts({ limit: 3, type: 'Announcement' });
			setAnnouncements(posts.map(post => ({
				id: post._id,
				title: post.title,
				date: post.date,
				urgent: post.important
			})));

			// Fetch dynamic stats
			try {
				const [userStats, clubStats, branchData, complaintStats] = await Promise.all([
					apiService.getUserPublicStats(),
					apiService.getClubPublicStats(),
					apiService.getBranches(),
					apiService.getComplaintPublicStats().catch(() => ({ total: 0, resolved: 0 }))
				]);

				// Calculate satisfaction rate (simple demo logic: resolved / total)
				let satisfaction = 95; // Default fallback
				if (complaintStats && complaintStats.total > 0) {
					satisfaction = Math.round((complaintStats.resolved || 0) / complaintStats.total * 100);
					if (satisfaction === 0) satisfaction = 100; // If no complaints yet, it's 100% technically
				}

				setStats({
					activeStudents: userStats?.total?.toLocaleString() || "0",
					clubs: clubStats?.total?.toString() || "0",
					serviceBranches: branchData?.count?.toString() || "0",
					satisfactionRate: `${satisfaction}%`
				});
			} catch (statError) {
				console.error('Error loading stats:', statError);
				// Keep defaults or set to fallback values
			}
		} catch (error) {
			console.error('Error loading general data:', error);
		} finally {
			setIsLoadingStats(false);
		}
	};

	const features = [
		{
			icon: Vote,
			title: "Democratic Elections",
			description: "Participate in secure, transparent student elections",
			link: "/elections",
			onLearnMore: () => setShowElectionModal(true),
			longDescription: "Our democratic election system empowers every student to have a voice in shaping university governance. Through secure online voting, you can elect student representatives, club leaders, and union officials. The platform ensures transparency with real-time results and maintains the integrity of each vote through advanced security measures."
		},
		{
			icon: Users,
			title: "Student Clubs",
			description: "Join or create clubs and associations",
			link: "/clubs",
			onLearnMore: () => setShowClubModal(true),
			longDescription: "Student clubs are the heart of campus life at DBU. Whether you're interested in academics, sports, culture, technology, or service, there's a club for you. Join existing clubs to connect with like-minded peers or start your own to pursue new interests. Each club receives support, resources, and opportunities to organize events and activities."
		},
		{
			icon: MessageSquare,
			title: "Voice Your Concerns",
			description: "Submit complaints and track their resolution",
			link: "/complaints",
			onLearnMore: () => setShowConcernsModal(true),
			longDescription: "Your concerns matter. Our complaint management system provides a direct channel to raise issues about academic matters, facilities, housing, dining services, or any other campus-related concerns. Each complaint is tracked with a unique case ID, assigned to the relevant department, and you can monitor the progress until resolution. We're committed to addressing your concerns promptly and effectively."
		},
		{
			icon: Building,
			title: "Branch Services",
			description: "Access specialized services from different branches",
			link: "/services",
			onLearnMore: () => setShowServicesModal(true),
			longDescription: "The Student Union operates through specialized branches, each dedicated to a specific aspect of student life. Our branches include Academic Affairs, Housing Services, Dining Services, Facilities Management, Health & Wellness, Career Services, and more. Each branch has dedicated staff and representatives ready to assist you with services, answer questions, and address concerns in their respective areas."
		},
	];

	const statsArray = [
		{ number: stats.activeStudents, label: "Active Students" },
		{ number: stats.clubs, label: "Student Clubs" },
		{ number: stats.serviceBranches, label: "Service Branches" },
		{ number: stats.satisfactionRate, label: "Satisfaction Rate" },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Carousel Section */}
			<section className="relative w-full h-[600px] overflow-hidden bg-gray-900">
				{carouselSlides.map((slide, index) => (
					<motion.div
						key={slide.id}
						initial={{ opacity: 0 }}
						animate={{ opacity: currentSlide === index ? 1 : 0 }}
						transition={{ duration: 1 }}
						className={`absolute inset-0 z-0 ${currentSlide === index ? 'pointer-events-auto' : 'pointer-events-none'}`}
					>
						{/* Blurred fill background to avoid dark side bars */}
						<img
							src={slide.image}
							alt=""
							aria-hidden="true"
							className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl transition-transform duration-10000"
							style={{
								transform: currentSlide === index ? 'scale(1.15)' : 'scale(1.1)',
								filter: 'brightness(0.82) saturate(1.08)',
							}}
						/>
						<div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/30" />

						{/* Main clear image */}
						<img
							src={slide.image}
							alt={`Carousel slide ${index + 1}`}
							className="absolute inset-0 w-full h-full object-contain transition-transform duration-10000"
							style={{
								transform: currentSlide === index ? 'scale(1.02)' : 'scale(1)',
								filter: index < 5
									? 'brightness(1.12) contrast(1.12) saturate(1.08)'
									: 'brightness(1.02) contrast(1.04)',
							}}
						/>
						<div className="absolute inset-0 bg-black/10" />

						<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center items-center text-center">
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: currentSlide === index ? 1 : 0, y: currentSlide === index ? 0 : 30 }}
								transition={{ duration: 0.8, delay: 0.3 }}>
								
								<motion.h1
									initial={{ opacity: 0, y: 40 }}
									animate={{ opacity: currentSlide === index ? 1 : 0, y: currentSlide === index ? 0 : 40 }}
									transition={{ duration: 0.7, delay: 0.2 }}
									className="text-4xl md:text-6xl font-bold mb-3 text-white drop-shadow-lg">
									{carouselCaptions[index % carouselCaptions.length]}
								</motion.h1>

								<motion.p
									initial={{ opacity: 0, y: 30 }}
									animate={{ opacity: currentSlide === index ? 1 : 0, y: currentSlide === index ? 0 : 30 }}
									transition={{ duration: 0.7, delay: 0.35 }}
									className="text-xl text-blue-200 font-medium tracking-wide uppercase">
									Debre Berhan University Student Affairs
								</motion.p>
							</motion.div>
						</div>
					</motion.div>
				))}

				{/* Carousel Navigation Arrows */}
				<button 
					onClick={prevSlide}
					className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-4 rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors backdrop-blur-sm"
				>
					<ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
				</button>
				<button 
					onClick={nextSlide}
					className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-4 rounded-full bg-black/30 hover:bg-black/60 text-white transition-colors backdrop-blur-sm"
				>
					<ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
				</button>

				{/* Carousel Indicators */}
				<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
					{carouselSlides.map((_, index) => (
						<button
							key={index}
							onClick={() => setCurrentSlide(index)}
							className={`transition-all duration-300 rounded-full ${
								currentSlide === index 
								? 'w-8 h-2 bg-blue-500' 
								: 'w-2 h-2 bg-white/50 hover:bg-white/80'
							}`}
							aria-label={`Go to slide ${index + 1}`}
						/>
					))}
				</div>
			</section>

			{/* Hero Action Bar — Buttons below carousel */}
			<div className="bg-gradient-to-r from-blue-700 to-blue-900 py-5 px-4">
				<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="text-white text-center sm:text-left">
						<p className="font-bold text-lg">DBU Student Affairs Office</p>
						<p className="text-blue-200 text-sm">Your gateway to campus services and leadership.</p>
					</div>
					{!user ? (
						<div className="flex flex-row gap-3">
							{/* Get Started — Action Gateway */}
							<motion.button
								whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(59,130,246,0.7)' }}
								whileTap={{ scale: 0.97 }}
								transition={{ type: 'spring', stiffness: 300, damping: 20 }}
								onClick={() => scrollToSection('services-section')}
								className="bg-white text-blue-700 px-7 py-3 rounded-xl font-bold shadow-lg cursor-pointer whitespace-nowrap">
								Get Started
							</motion.button>
							{/* Learn More — Exploration Gateway */}
							<motion.button
								whileHover={{ scale: 1.03, boxShadow: '0 0 16px rgba(255,255,255,0.2)' }}
								whileTap={{ scale: 0.97 }}
								transition={{ type: 'spring', stiffness: 300, damping: 20 }}
								onClick={() => scrollToSection('leadership')}
								className="bg-transparent border-2 border-white text-white px-7 py-3 rounded-xl font-bold cursor-pointer whitespace-nowrap hover:bg-white/10">
								Learn More
							</motion.button>
						</div>
					) : (
						<motion.div
							whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(255,255,255,0.3)' }}
							whileTap={{ scale: 0.97 }}
							transition={{ type: 'spring', stiffness: 300 }}>
							<Link to="/dashboard" className="bg-white text-blue-700 px-7 py-3 rounded-xl font-bold shadow-lg inline-block">
								Go to Dashboard
							</Link>
						</motion.div>
					)}
				</div>
			</div>

			{/* Official Directives Section */}
			<section className="py-12 bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col md:flex-row items-center justify-between mb-8">
						<div>
							<h2 className="text-3xl font-bold text-red-700 flex items-center gap-2">
								<span className="w-2 h-8 bg-red-700 rounded-full inline-block"></span>
								Official Directives
							</h2>
							<p className="text-gray-600 mt-1">High-priority updates from University Leadership</p>
						</div>
						{user && user.isAdmin && (
							<button className="mt-4 md:mt-0 bg-red-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800 transition-colors">
								+ Post Directive
							</button>
						)}
					</div>
					
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Example Directive 1 */}
						<div className="bg-white border-2 border-red-100 rounded-xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
							<div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
								<img src="/images/logo.png" alt="watermark" className="w-32 h-32" />
							</div>
							<div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
								<img src="/images/sintayew.png" className="w-12 h-12 rounded-full border-2 border-red-50 object-cover" alt="Author" />
								<div>
									<h4 className="font-bold text-gray-900">Pr. Sintayew</h4>
									<p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Head of Psychology & Guidance</p>
								</div>
							</div>
							<h3 className="text-xl font-bold text-gray-900 mb-2">Guidance Workshop on the 3rd Floor this Friday.</h3>
							<p className="text-gray-600 mb-6 flex-grow">All students are invited to attend our mental health and guidance workshop to discuss student wellbeing and resources available on campus.</p>
							<div className="flex items-center justify-between pt-4 border-t border-gray-50">
								<button onClick={() => !user && navigate('/login')} className="text-red-700 font-medium text-sm hover:underline flex items-center gap-1">Read More <ArrowRight className="w-4 h-4" /></button>
								<button onClick={() => !user && navigate('/login')} className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
									<MessageSquare className="w-4 h-4" /> Save / Acknowledge
								</button>
							</div>
						</div>

						{/* Example Directive 2 */}
						<div className="bg-white border-2 border-red-100 rounded-xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
							<div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
								<img src="/images/logo.png" alt="watermark" className="w-32 h-32" />
							</div>
							<div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
								<img src="/images/genete.png" className="w-12 h-12 rounded-full border-2 border-red-50 object-cover" alt="Author" />
								<div>
									<h4 className="font-bold text-gray-900">Genete Fetene</h4>
									<p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Head of Dormitory Services</p>
								</div>
							</div>
							<h3 className="text-xl font-bold text-gray-900 mb-2">Dormitory Registration for 2nd Year Students is now open.</h3>
							<p className="text-gray-600 mb-6 flex-grow">Please ensure all required documents are submitted to the housing office before the end of the week. Late submissions will face penalties.</p>
							<div className="flex items-center justify-between pt-4 border-t border-gray-50">
								<button onClick={() => !user && navigate('/login')} className="text-red-700 font-medium text-sm hover:underline flex items-center gap-1">Read More <ArrowRight className="w-4 h-4" /></button>
								<button onClick={() => !user && navigate('/login')} className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
									<MessageSquare className="w-4 h-4" /> Save / Acknowledge
								</button>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-16 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
						{statsArray.map((stat, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
								className="text-center">
								<div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
									{isLoadingStats ? "..." : stat.number}
								</div>
								<div className="text-gray-600">{stat.label}</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section id="services-section" className="py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							Our Services
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Comprehensive services designed to enhance your university
							experience
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
						{features.map((feature, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
								className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow group">
								<div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
									<feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									{feature.title}
								</h3>
								<p className="text-gray-600 mb-4">{feature.description}</p>
								<button
									onClick={feature.onLearnMore}
									className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
									Learn More
									<ArrowRight className="w-4 h-4 ml-1" />
								</button>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Upcoming Club Events Hub */}
			<section className="py-16 bg-blue-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col md:flex-row items-center justify-between mb-8">
						<div>
							<h2 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Club Events</h2>
							<p className="text-gray-600">Discover what's happening across all 11 campus clubs.</p>
						</div>
						<div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
							<select className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
								<option value="all">All Clubs</option>
								<option value="tecktonic">Tecktonic</option>
								<option value="begoadragot">Begoadragot</option>
								<option value="hohe-tesfa">Hohe Tesfa</option>
								<option value="law-club">Law Club</option>
								<option value="career-dev">Career Development</option>
								<option value="idea-hub">Idea Hub</option>
								<option value="truth-culture">Truth Culture</option>
								<option value="booking">Booking Club</option>
								<option value="civil-eng">Civil Engineering</option>
								<option value="mech-club">Mechanical Club</option>
								<option value="food-eng">Food Engineering</option>
							</select>
							{user && user.role === 'club_leader' && (
								<button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
									+ Post Event
								</button>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Example Event */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
							<div className="h-32 bg-blue-600 p-6 flex flex-col justify-end bg-gradient-to-tr from-blue-700 to-blue-500">
								<span className="text-blue-100 font-bold text-xs uppercase tracking-wider mb-1">Tecktonic</span>
								<h3 className="text-white text-xl font-bold leading-tight">Annual Hackathon</h3>
							</div>
							<div className="p-6 flex flex-col flex-grow">
								<div className="flex justify-between text-sm text-gray-500 mb-4 font-medium">
									<span>📅 Oct 15, 2026</span>
									<span>📍 Block 42 Lab</span>
								</div>
								<p className="text-gray-600 mb-6 flex-grow text-sm">Join us for a 24-hour coding sprint to build innovative solutions for campus problems. Top 3 teams win incubation space!</p>
								<button onClick={() => !user && navigate('/login')} className="w-full border-2 border-blue-600 text-blue-600 font-bold py-2.5 rounded-lg hover:bg-blue-50 transition-colors mt-auto">
									Register Now
								</button>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Leadership & Services Expansion Section */}
			<section className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							Leadership & Services
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Meet the dedicated leadership team guiding our university's student services.
						</p>
					</div>

					{/* Leadership Section */}
					<div id="leadership" className="mb-16 pt-24 -mt-24">
						<h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Office of the Dean</h3>
						<div className="grid grid-cols-1 gap-8">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100 flex flex-col items-center text-center h-full max-w-3xl mx-auto">
								<div className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-blue-50 bg-gray-100">
									<img src="/image.png/gizew.jpg" alt="Gizew Fetene" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=Gizew+Fetene&background=EBF5FF&color=1E3A8A&size=128" }} />
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-1">Gizew Fetene</h3>
								<p className="text-blue-600 font-semibold mb-4">Dean of Student Affairs</p>
								<div className="text-gray-600 mb-4 flex-grow text-left w-full bg-gray-50 p-4 rounded-lg">
									<p className="mb-2"><strong>Background:</strong> DBU graduate and long-serving student affairs leader with a strong focus on student wellbeing, inclusion, and campus service quality.</p>
									<p className="mb-2"><strong>Function:</strong> Oversees student welfare, guidance coordination, club development, complaint response systems, and branch-level service performance across the university.</p>
									{showDeanMore && (
										<>
											<p className="mb-2"><strong>Office Responsibility:</strong> Ensures services are fair, timely, and student-centered; coordinates with departments to resolve urgent student issues and improve policy implementation.</p>
											<p><strong>If a student needs help:</strong> Students can report concerns through Student Affairs channels for academic support, personal guidance referrals, accommodation issues, and service follow-up.</p>
										</>
									)}
									<button
										onClick={() => setShowDeanMore((prev) => !prev)}
										className="mt-3 text-blue-700 font-semibold hover:underline"
									>
										{showDeanMore ? "Show Less" : "Read More..."}
									</button>
								</div>
							</motion.div>
						</div>
					</div>

					{/* Guidance Section */}
					<div id="guidance" className="mb-16 pt-24 -mt-24">
						<h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Psychology & Guidance Department</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100 flex flex-col items-center text-center h-full">
								<div className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-blue-50 bg-gray-100">
									<img src="/image.png/sint.png" alt="Pr. Sintayew" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=Pr+Sintayew&background=EBF5FF&color=1E3A8A&size=128" }} />
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-1">Pr. Sintayew</h3>
								<p className="text-blue-600 font-semibold mb-4">Head of Psychology & Guidance</p>
								<div className="text-gray-600 mb-4 flex-grow text-left w-full bg-gray-50 p-4 rounded-lg">
									<p className="mb-2"><strong>Background:</strong> Senior guidance professional focused on student mental wellness and personal development support.</p>
									<p className="mb-2"><strong>Location:</strong> Psychology & Guidance Office, 3rd Floor Bureau.</p>
									<p className="mb-2"><strong>Function:</strong> Provides counseling, crisis intervention, and student advisory services.</p>
									{showSintayewMore && (
										<>
											<p className="mb-2"><strong>Key Support Areas:</strong> Stress management, academic pressure, conflict mediation, and personal guidance referrals.</p>
											<p><strong>How students can get help:</strong> Visit the office directly or request support through Student Affairs for confidential follow-up.</p>
										</>
									)}
									<button
										onClick={() => setShowSintayewMore((prev) => !prev)}
										className="mt-3 text-blue-700 font-semibold hover:underline"
									>
										{showSintayewMore ? "Show Less" : "Read More..."}
									</button>
								</div>
							</motion.div>
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100 flex flex-col items-center text-center h-full">
								<div className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-blue-50 bg-gray-100">
									<img src="/images/kalkidan.png" alt="Kalkidan Desta" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=Kalkidan+Desta&background=EBF5FF&color=1E3A8A&size=128" }} />
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-1">Kalkidan Desta</h3>
								<p className="text-blue-600 font-semibold mb-4">VP of Psychology & Guidance</p>
								<div className="text-gray-600 mb-4 flex-grow text-left w-full bg-gray-50 p-4 rounded-lg">
									<p><strong>Function:</strong> Administrative and operational support for the Guidance department.</p>
								</div>
							</motion.div>
						</div>
					</div>

					{/* Dormitory Section */}
					<div id="dormitory" className="mb-16 pt-24 -mt-24">
						<h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Dormitory Services</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
								className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100 flex flex-col items-center text-center h-full">
								<div className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-blue-50 bg-gray-100">
									<img src="/images/genete.png" alt="Genete Fetene" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=Genete+Fetene&background=EBF5FF&color=1E3A8A&size=128" }} />
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-1">Genete Fetene</h3>
								<p className="text-blue-600 font-semibold mb-4">Head of Dormitory Services</p>
								<div className="text-gray-600 mb-4 flex-grow text-left w-full bg-gray-50 p-4 rounded-lg">
									<p className="mb-2"><strong>Scale:</strong> Leads a team of 90 staff members.</p>
									<p><strong>Function:</strong> Handles all student housing, registration, and room placements.</p>
								</div>
							</motion.div>
						</div>
					</div>

					{/* Student Union Dropdown */}
					<div id="student-union" className="mb-16 pt-16 -mt-16">
						<details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
							<summary className="text-xl md:text-2xl font-bold text-gray-800 p-6 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors">
								Student Union Executive Committee
								<span className="text-blue-600 group-open:rotate-180 transition-transform duration-300">
									▼
								</span>
							</summary>
							<div className="p-6 border-t border-gray-100 bg-gray-50">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
									<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
										<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">P</div>
										<div>
											<p className="text-gray-900 font-bold">President</p>
											<p className="text-sm text-gray-500">Student Union</p>
										</div>
									</div>
									<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
										<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">V</div>
										<div>
											<p className="text-gray-900 font-bold">Vice President</p>
											<p className="text-sm text-gray-500">Student Union</p>
										</div>
									</div>
									<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
										<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">S</div>
										<div>
											<p className="text-gray-900 font-bold">Secretary</p>
											<p className="text-sm text-gray-500">Student Union</p>
										</div>
									</div>
									<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
										<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">A</div>
										<div>
											<p className="text-gray-900 font-bold">Afegubaye</p>
											<p className="text-sm text-gray-500">Student Union</p>
										</div>
									</div>
									<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
										<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">G</div>
										<div>
											<p className="text-gray-900 font-bold">General Service</p>
											<p className="text-sm text-gray-500">Student Union</p>
										</div>
									</div>
									<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
										<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">Au</div>
										<div>
											<p className="text-gray-900 font-bold">Audit</p>
											<p className="text-sm text-gray-500">Student Union</p>
										</div>
									</div>
								</div>
							</div>
						</details>
					</div>
				</div>
			</section>

			{/* Announcements Section */}
			<section className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between mb-12">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900">
							Latest Announcements
						</h2>
						<Link
							to="/latest"
							className="text-blue-600 hover:text-blue-700 font-medium">
							View All
						</Link>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{announcements.length > 0 ? (
							announcements.map((announcement, index) => (
								<motion.div
									key={announcement.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.1 }}
									className={`bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow ${announcement.urgent ? "border-l-4 border-red-500" : ""
										}`}>
									{announcement.urgent && (
										<span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mb-3">
											Urgent
										</span>
									)}
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										{announcement.title}
									</h3>
									<p className="text-sm text-gray-500">
										{new Date(announcement.date).toLocaleDateString()}
									</p>
								</motion.div>
							))
						) : (
							<div className="col-span-3 text-center py-12">
								<p className="text-gray-500">No announcements available at the moment</p>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-r from-blue-700 to-blue-500 text-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						Join the Student Affairs Community
					</h2>
					<p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
						Make your voice heard, drive change, and enhance your university
						experience
					</p>
					{!user && (
						<Link
							to="/login"
							className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors inline-flex items-center">
							Get Started Today
							<ArrowRight className="w-5 h-5 ml-2" />
						</Link>
					)}
				</div>
			</section>

			{/* Modals */}
			{showElectionModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowElectionModal(false)}>
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-xl p-8 max-w-2xl w-full"
						onClick={(e) => e.stopPropagation()}>
						<h3 className="text-2xl font-bold text-gray-900 mb-4">Democratic Elections</h3>
						<p className="text-gray-700 mb-6">{features[0].longDescription}</p>
						<div className="flex gap-4">
							<Link to="/elections" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">Go to Elections</Link>
							<button onClick={() => setShowElectionModal(false)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
						</div>
					</motion.div>
				</div>
			)}

			{showClubModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowClubModal(false)}>
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-xl p-8 max-w-2xl w-full"
						onClick={(e) => e.stopPropagation()}>
						<h3 className="text-2xl font-bold text-gray-900 mb-4">Student Clubs</h3>
						<p className="text-gray-700 mb-6">{features[1].longDescription}</p>
						<div className="flex gap-4">
							<Link to="/clubs" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">Explore Clubs</Link>
							<button onClick={() => setShowClubModal(false)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
						</div>
					</motion.div>
				</div>
			)}

			{showConcernsModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowConcernsModal(false)}>
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-xl p-8 max-w-2xl w-full"
						onClick={(e) => e.stopPropagation()}>
						<h3 className="text-2xl font-bold text-gray-900 mb-4">Voice Your Concerns</h3>
						<p className="text-gray-700 mb-6">{features[2].longDescription}</p>
						<div className="flex gap-4">
							<Link to="/complaints" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">Submit Complaint</Link>
							<button onClick={() => setShowConcernsModal(false)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
						</div>
					</motion.div>
				</div>
			)}

			{showServicesModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowServicesModal(false)}>
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-xl p-8 max-w-2xl w-full"
						onClick={(e) => e.stopPropagation()}>
						<h3 className="text-2xl font-bold text-gray-900 mb-4">Branch Services</h3>
						<p className="text-gray-700 mb-6">{features[3].longDescription}</p>
						<div className="flex gap-4">
							<Link to="/services" className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">View Services</Link>
							<button onClick={() => setShowServicesModal(false)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	);
};
