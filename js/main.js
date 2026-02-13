/**
 * ===================================================================
 * main js
 *
 * -------------------------------------------------------------------
 */

(function ($) {
  // ----------------------------------------------------
  // Featured Projects Section
  // ----------------------------------------------------
  function createFeaturedSection(featuredProjects) {
    const portfolioBox = document.getElementById("portfolio_box");
    if (!portfolioBox) return;

    // Create section container
    const featuredSection = document.createElement("div");
    featuredSection.id = "github-featured-section";
    featuredSection.style.marginTop = "2em";

    // Title
    const title = document.createElement("h2");
    title.textContent = "Featured Projects";
    title.style.marginBottom = "1em";
    featuredSection.appendChild(title);

    // Cards container
    const cardsContainer = document.createElement("div");
    cardsContainer.id = "github-featured-cards";
    cardsContainer.style.display = "flex";
    cardsContainer.style.flexWrap = "wrap";
    cardsContainer.style.gap = "1em";
    featuredSection.appendChild(cardsContainer);

    // Render featured cards
    featuredProjects.forEach((repo) => {
      const card = document.createElement("div");
      card.className = "github-card";
      card.style.background = "#fff";
      card.style.border = "1px solid #e1e4e8";
      card.style.borderRadius = "8px";
      card.style.padding = "1em";
      card.style.width = "290px";
      card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";

      // Repo name
      const name = document.createElement("a");
      name.href = repo.html_url;
      name.target = "_blank";
      name.textContent = repo.name;
      name.style.fontWeight = "bold";
      name.style.fontSize = "1.2em";
      card.appendChild(name);

      // Description
      const desc = document.createElement("p");
      desc.textContent = repo.description || "No description";
      desc.style.margin = "0.5em 0";
      card.appendChild(desc);

      // Language and stars
      const meta = document.createElement("div");
      meta.style.display = "flex";
      meta.style.justifyContent = "space-between";
      meta.style.alignItems = "center";

      const lang = document.createElement("span");
      lang.textContent = repo.language || "";
      lang.style.fontSize = "0.9em";
      lang.style.color = "#555";

      const stars = document.createElement("span");
      stars.innerHTML = `<i class="fa fa-star" style="color:gold"></i> ${repo.stargazers_count}`;

      meta.appendChild(lang);
      meta.appendChild(stars);
      card.appendChild(meta);

      cardsContainer.appendChild(card);
    });

    portfolioBox.appendChild(featuredSection);
  }

  // ----------------------------------------------------
  // Github Portfolio Cards Section with Pagination
  // ----------------------------------------------------
  function createGithubSection() {
    // Add a header for the section
    const portfolioBox = document.getElementById("portfolio_box");
    if (!portfolioBox) return;

    // Create section container
    const githubSection = document.createElement("div");
    githubSection.id = "github-portfolio-section";
    githubSection.style.marginTop = "2em";

    // Title
    const title = document.createElement("h2");
    title.textContent = "Other repos";
    title.style.marginBottom = "1em";
    title.style.marginTop = "2em";
    githubSection.appendChild(title);

    // Cards container
    const cardsContainer = document.createElement("div");
    cardsContainer.id = "github-cards-container";
    cardsContainer.style.display = "flex";
    cardsContainer.style.flexWrap = "wrap";
    cardsContainer.style.gap = "1em";
    githubSection.appendChild(cardsContainer);

    // Pagination controls
    const pagination = document.createElement("div");
    pagination.id = "github-pagination";
    pagination.style.marginTop = "1em";
    pagination.style.display = "flex";
    pagination.style.justifyContent = "center";
    pagination.style.gap = "1em";
    githubSection.appendChild(pagination);

    portfolioBox.appendChild(githubSection);
  }

  // Helper to fetch repos from Github API
  async function fetchGithubRepos(username, page = 1, per_page = 12) {
    const url = `https://api.github.com/users/${username}/repos?sort=updated&page=${page}&per_page=${per_page}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  }

  // Helper to fetch a single repo by name
  async function fetchGithubRepo(username, repoName) {
    const url = `https://api.github.com/repos/${username}/${repoName}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  }

  // Helper to render repo cards
  function renderRepoCards(repos) {
    const container = document.getElementById("github-cards-container");
    if (!container) return;
    container.innerHTML = "";
    repos.forEach((repo) => {
      const card = document.createElement("div");
      card.className = "github-card";
      card.style.background = "#fff";
      card.style.border = "1px solid #e1e4e8";
      card.style.borderRadius = "8px";
      card.style.padding = "1em";
      card.style.width = "290px";
      card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";

      // Repo name
      const name = document.createElement("a");
      name.href = repo.html_url;
      name.target = "_blank";
      name.textContent = repo.name;
      name.style.fontWeight = "bold";
      name.style.fontSize = "1.2em";
      card.appendChild(name);

      // Description
      const desc = document.createElement("p");
      desc.textContent = repo.description || "No description";
      desc.style.margin = "0.5em 0";
      card.appendChild(desc);

      // Language and stars
      const meta = document.createElement("div");
      meta.style.display = "flex";
      meta.style.justifyContent = "space-between";
      meta.style.alignItems = "center";

      const lang = document.createElement("span");
      lang.textContent = repo.language || "";
      lang.style.fontSize = "0.9em";
      lang.style.color = "#555";

      const stars = document.createElement("span");
      stars.innerHTML = `<i class="fa fa-star" style="color:gold"></i> ${repo.stargazers_count}`;

      meta.appendChild(lang);
      meta.appendChild(stars);
      card.appendChild(meta);

      container.appendChild(card);
    });
  }

  // Helper to render pagination controls
  function renderPagination(currentPage, totalPages, onPageChange) {
    const pagination = document.getElementById("github-pagination");
    if (!pagination) return;
    pagination.innerHTML = "";

    // Responsive container
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.flexWrap = "wrap";
    navContainer.style.alignItems = "center";
    navContainer.style.justifyContent = "center";
    navContainer.style.gap = "0.5em";
    navContainer.style.width = "100%";
    navContainer.style.margin = "0 auto";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    prevBtn.className = "github-page-btn";
    prevBtn.style.borderRadius = "4px";
    prevBtn.style.padding = "0.1em 0.5em 0.1em 0.5em";
    prevBtn.style.border = "1px solid #e1e4e8";
    prevBtn.style.background = "#f6f8fa";
    prevBtn.style.cursor = currentPage > 1 ? "pointer" : "not-allowed";
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) onPageChange(currentPage - 1);
    };

    // Page indicator
    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    pageInfo.style.fontWeight = "bold";
    pageInfo.style.fontSize = "1em";
    pageInfo.style.padding = "0.1em 0.5em 0.1em 0.5em";
    pageInfo.style.background = "#fff";
    pageInfo.style.borderRadius = "4px";
    pageInfo.style.minWidth = "120px";
    pageInfo.style.textAlign = "center";

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.className = "github-page-btn";
    nextBtn.style.borderRadius = "4px";
    nextBtn.style.padding = "0.1em 0.5em 0.1em 0.5em";
    nextBtn.style.border = "1px solid #e1e4e8";
    nextBtn.style.background = "#f6f8fa";
    nextBtn.style.cursor = currentPage < totalPages ? "pointer" : "not-allowed";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    navContainer.appendChild(prevBtn);
    navContainer.appendChild(pageInfo);
    navContainer.appendChild(nextBtn);

    pagination.appendChild(navContainer);
  }

  // Main function to load and paginate Github repos
  async function loadGithubPortfolio(
    username = "ivanmmurciaua",
    per_page = 12,
    excludeRepos = [],
  ) {
    let currentPage = 1;
    let totalPages = 1;
    let filteredRepos = [];

    // Fetch all repos, filter, and paginate in JS
    async function fetchAllRepos() {
      let allRepos = [];
      let page = 1;
      let done = false;
      while (!done) {
        const repos = await fetchGithubRepos(username, page, 100);
        allRepos = allRepos.concat(repos);
        if (repos.length < 100) {
          done = true;
        } else {
          page++;
        }
      }
      return allRepos;
    }

    async function updatePage(page) {
      currentPage = page;
      if (filteredRepos.length === 0) {
        const allRepos = await fetchAllRepos();
        filteredRepos = allRepos.filter(
          (repo) => !excludeRepos.includes(repo.name),
        );
        totalPages = Math.max(1, Math.ceil(filteredRepos.length / per_page));
      }
      const startIdx = (currentPage - 1) * per_page;
      const pageRepos = filteredRepos.slice(startIdx, startIdx + per_page);

      renderRepoCards(pageRepos);
      renderPagination(currentPage, totalPages, updatePage);
    }

    updatePage(1);
  }

  // Add my own repos, and optionally yours (OpenAI) if you want to show functional code
  async function addDefaultGithubSections() {
    // Define featured projects by repo name
    const featuredRepoNames = [
      "R1DO-tools",
      "R1DO-wallet",
      "EIP-5216",
      "web3-tx",
    ];
    const excludeRepoNames = [
      "ivanmmurciaua",
      "P3",
      "PED",
      "P2",
      "LPP",
      "ETO",
      "IR",
      "IAPE",
      "INGP",
      "PPSS",
      "GRP6-GRP3-Yelabay",
      "SD",
      "SI",
      ...featuredRepoNames,
    ];

    // Fetch featured repo data
    const featuredProjects = [];
    for (const repoName of featuredRepoNames) {
      const repo = await fetchGithubRepo("ivanmmurciaua", repoName);
      if (repo) featuredProjects.push(repo);
    }

    createFeaturedSection(featuredProjects);
    createGithubSection();
    loadGithubPortfolio("ivanmmurciaua", 12, excludeRepoNames);
  }

  // Run on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", function () {
    addDefaultGithubSections();
  });

  ("use strict");

  /*---------------------------------------------------- */
  /* Preloader
	------------------------------------------------------ */
  $(window).load(function () {
    // will first fade out the loading animation
    $("#loader").fadeOut("slow", function () {
      // will fade out the whole DIV that covers the website.
      $("#preloader").delay(300).fadeOut("slow");
    });
  });

  /*---------------------------------------------------- */
  /* FitText Settings
  	------------------------------------------------------ */
  setTimeout(function () {
    $("#intro h1").fitText(1, { minFontSize: "42px", maxFontSize: "84px" });
  }, 100);

  /*---------------------------------------------------- */
  /* FitVids
	------------------------------------------------------ */
  $(".fluid-video-wrapper").fitVids();

  /*---------------------------------------------------- */
  /* Owl Carousel
	------------------------------------------------------ */
  $("#owl-slider").owlCarousel({
    navigation: false,
    pagination: true,
    itemsCustom: [
      [0, 1],
      [700, 2],
      [960, 3],
    ],
    navigationText: false,
  });

  /*----------------------------------------------------- */
  /* Alert Boxes
  	------------------------------------------------------- */
  $(".alert-box").on("click", ".close", function () {
    //$(this).parent().fadeOut(500);
    document.getElementById("screen-overlay-text").style.display = "none";
    document.getElementById("screen-overlay-text-crypto").style.display =
      "none";
  });

  /*----------------------------------------------------- */
  /* Stat Counter
  	------------------------------------------------------- */
  var statSection = $("#stats"),
    stats = $(".stat-count");

  statSection.waypoint({
    handler: function (direction) {
      if (direction === "down") {
        stats.each(function () {
          var $this = $(this);

          $({ Counter: 0 }).animate(
            { Counter: $this.text() },
            {
              duration: 4000,
              easing: "swing",
              step: function (curValue) {
                $this.text(Math.ceil(curValue));
              },
            },
          );
        });
      }

      // trigger once only
      this.destroy();
    },

    offset: "90%",
  });

  /*---------------------------------------------------- */
  /*	Masonry
	------------------------------------------------------ */
  var containerProjects = $("#folio-wrapper");

  containerProjects.imagesLoaded(function () {
    containerProjects.masonry({
      itemSelector: ".folio-item",
      resize: true,
    });
  });

  /*----------------------------------------------------*/
  /*	Modal Popup
	------------------------------------------------------*/
  $(".item-wrap a").magnificPopup({
    type: "inline",
    fixedContentPos: false,
    removalDelay: 300,
    showCloseBtn: false,
    mainClass: "mfp-fade",
  });

  $(document).on("click", ".popup-modal-dismiss", function (e) {
    e.preventDefault();
    $.magnificPopup.close();
  });

  /*-----------------------------------------------------*/
  /* Navigation Menu
   ------------------------------------------------------ */
  var toggleButton = $(".menu-toggle"),
    nav = $(".main-navigation");

  // toggle button
  toggleButton.on("click", function (e) {
    e.preventDefault();
    toggleButton.toggleClass("is-clicked");
    nav.slideToggle();
  });

  // nav items
  nav.find("li a").on("click", function () {
    // update the toggle button
    toggleButton.toggleClass("is-clicked");
    // fadeout the navigation panel
    nav.fadeOut();
  });

  /*---------------------------------------------------- */
  /* Highlight the current section in the navigation bar
  	------------------------------------------------------ */
  var sections = $("section"),
    navigation_links = $("#main-nav-wrap li a");

  sections.waypoint({
    handler: function (direction) {
      var active_section;

      active_section = $("section#" + this.element.id);

      if (direction === "up") active_section = active_section.prev();

      var active_link = $(
        '#main-nav-wrap a[href="#' + active_section.attr("id") + '"]',
      );

      navigation_links.parent().removeClass("current");
      active_link.parent().addClass("current");
    },

    offset: "25%",
  });

  /*---------------------------------------------------- */
  /* Smooth Scrolling
  	------------------------------------------------------ */
  $(".smoothscroll").on("click", function (e) {
    e.preventDefault();

    var target = this.hash,
      $target = $(target);

    $("html, body")
      .stop()
      .animate(
        {
          scrollTop: $target.offset().top,
        },
        800,
        "swing",
        function () {
          window.location.hash = target;
        },
      );
  });

  /*---------------------------------------------------- */
  /*  Placeholder Plugin Settings
	------------------------------------------------------ */
  $("input, textarea, select").placeholder();

  /*----------------------------------------------------- */
  /* Back to top
   ------------------------------------------------------- */
  var pxShow = 300; // height on which the button will show
  var fadeInTime = 400; // how slow/fast you want the button to show
  var fadeOutTime = 400; // how slow/fast you want the button to hide
  var scrollSpeed = 300; // how slow/fast you want the button to scroll to top. can be a value, 'slow', 'normal' or 'fast'

  // Show or hide the sticky footer button
  jQuery(window).scroll(function () {
    if (!$("#header-search").hasClass("is-visible")) {
      if (jQuery(window).scrollTop() >= pxShow) {
        jQuery("#go-top").fadeIn(fadeInTime);
      } else {
        jQuery("#go-top").fadeOut(fadeOutTime);
      }
    }
  });
})(jQuery);
